import React, { useState, useEffect } from 'react';
import { Sparkles, GraduationCap, User, FileText } from 'lucide-react';
import Button from '../components/common/Button.jsx';
import Spinner from '../components/common/Spinner.jsx';
import FileDropZone from '../components/FileDropZone.jsx';
import GradingReport from '../components/GradingReport.jsx';
import PdfExport from '../components/PdfExport.jsx';
import { runGrading } from '../lib/grade.js';
import { assignmentsStore, rubricsStore, persistGrading } from '../lib/storage.js';
import { useApi } from '../hooks/useApi.js';
import { useWorkflow } from '../context/WorkflowContext.jsx';

export default function GradingPage({ modelSelector, notify }) {
  const { currentAssignment, setCurrentAssignment, currentRubric, setCurrentRubric, setCurrentGrading } = useWorkflow();

  const [assignments, setAssignments] = useState([]);
  const [rubrics, setRubrics] = useState([]);
  const [showPicker, setShowPicker] = useState(null); // 'assignment' | 'rubric' | null

  const [studentName, setStudentName] = useState('');
  const [inputMode, setInputMode] = useState('text'); // 'text' | 'file'
  const [submissionText, setSubmissionText] = useState('');
  const [lastFile, setLastFile] = useState(null);
  const [submissionAttachments, setSubmissionAttachments] = useState([]);

  const [grading, setGrading] = useState(null);
  const [lastSubmission, setLastSubmission] = useState(null);

  const { run: grade, loading: grading_loading } = useApi(runGrading);

  useEffect(() => {
    assignmentsStore.list().then((items) => setAssignments(items)).catch(() => {});
    rubricsStore.list().then((items) => setRubrics(items)).catch(() => {});
  }, []);

  function canGrade() {
    if (!currentAssignment || !currentRubric) return false;
    if (!submissionText.trim()) return false;
    if (modelSelector.keyStatus !== 'valid') return false;
    return true;
  }

  async function handleGrade() {
    if (!canGrade()) {
      notify('error', '과제·루브릭·답안·API 키가 모두 필요합니다.');
      return;
    }
    try {
      const submission = {
        content: submissionText,
        studentName: studentName || null,
        originalFilename: lastFile?.filename || null,
        mimeType: lastFile?.mimeType || null,
      };
      const result = await grade({
        ...modelSelector.payload,
        assignment: currentAssignment,
        rubric: currentRubric,
        submission,
        files: submissionAttachments,
      });
      // IndexedDB에 영속화
      const persisted = await persistGrading({
        assignment: currentAssignment,
        rubric: currentRubric,
        submission,
        grading: result,
        provider: modelSelector.selectedProvider,
        modelId: modelSelector.selectedModelId,
      });
      setGrading(persisted.grading);
      setLastSubmission(persisted.submission);
      setCurrentGrading(persisted.grading);
      notify('success', '채점 완료!');
    } catch (err) {
      notify('error', `채점 실패: ${err.message}`);
    }
  }

  function handleFileParsed(result) {
    setSubmissionText(result.text);
    setLastFile({
      filename: result.filename,
      mimeType: result.mimeType,
      pages: result.pages,
      charCount: result.charCount,
    });
    setSubmissionAttachments(result.attachments || []);
    notify('success', `"${result.filename}" 파싱 완료 (${result.charCount.toLocaleString()}자)`);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text flex items-center gap-2">
          <GraduationCap className="text-caution" /> 1차 채점
        </h1>
        <p className="text-sm text-text-muted mt-1">과제·루브릭·학생 답안을 입력하면 루브릭에 따라 자동 채점합니다.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* 좌측 입력 */}
        <div className="lg:col-span-2 space-y-4">
          {/* 과제·루브릭 선택 */}
          <div className="bg-surface-raised border border-edge rounded-xl p-5">
            <h2 className="text-sm font-semibold text-text border-b border-edge pb-2 mb-3">과제 · 루브릭 선택</h2>
            <SlotCard
              label="과제"
              value={currentAssignment?.title}
              emptyLabel="과제를 선택하세요"
              onOpen={() => setShowPicker(showPicker === 'assignment' ? null : 'assignment')}
              open={showPicker === 'assignment'}
              items={assignments}
              getLabel={(a) => a.title}
              getSubLabel={(a) => `${a.subject || '-'} · ${a.difficulty || '-'}`}
              onPick={(a) => { setCurrentAssignment(a); setShowPicker(null); }}
            />
            <div className="h-3" />
            <SlotCard
              label="루브릭"
              value={currentRubric?.title}
              emptyLabel="루브릭을 선택하세요"
              onOpen={() => setShowPicker(showPicker === 'rubric' ? null : 'rubric')}
              open={showPicker === 'rubric'}
              items={currentAssignment
                ? rubrics.filter((r) => r.assignmentId === currentAssignment.id || !r.assignmentId)
                : rubrics}
              getLabel={(r) => r.title}
              getSubLabel={(r) => `${(r.criteria || []).length}개 기준 · ${r.scaleType}`}
              onPick={(r) => { setCurrentRubric(r); setShowPicker(null); }}
            />
          </div>

          {/* 학생 답안 */}
          <div className="bg-surface-raised border border-edge rounded-xl p-5">
            <h2 className="text-sm font-semibold text-text border-b border-edge pb-2 mb-3">학생 답안</h2>

            <div className="mb-3">
              <label className="text-xs text-text-muted flex items-center gap-1">
                <User size={11} /> 학생 이름 (선택)
              </label>
              <input
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="홍길동"
                className="mt-1 w-full bg-surface-sunken border border-edge-strong rounded-lg px-3 py-2 text-sm text-text"
              />
            </div>

            <div className="flex gap-1.5 mb-3">
              {[
                { id: 'text', label: '텍스트 입력' },
                { id: 'file', label: '파일 업로드' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setInputMode(t.id)}
                  className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors
                    ${inputMode === t.id ? 'bg-brand border-brand text-brand-fg'
                      : 'bg-surface-sunken border-edge-strong text-text-muted hover:border-text-subtle'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {inputMode === 'file' ? (
              <FileDropZone onParsed={handleFileParsed} onError={(e) => notify('error', e.message)} />
            ) : null}

            <textarea
              value={submissionText}
              onChange={(e) => setSubmissionText(e.target.value)}
              placeholder={inputMode === 'file' ? '파일을 업로드하면 자동으로 채워집니다.' : '학생 답안 전문을 붙여넣으세요.'}
              rows={10}
              className="mt-3 w-full bg-surface-sunken border border-edge-strong rounded-lg px-3 py-2 text-sm text-text resize-y font-mono"
            />
            {submissionText && (
              <p className="text-[11px] text-text-subtle mt-1">
                {submissionText.length.toLocaleString()}자
                {lastFile && ` · ${lastFile.filename}`}
              </p>
            )}

            <Button
              onClick={handleGrade}
              loading={grading_loading}
              disabled={!canGrade()}
              icon={Sparkles}
              className="w-full mt-3"
            >
              채점 실행
            </Button>
            {modelSelector.keyStatus !== 'valid' && (
              <p className="text-[11px] text-caution-fg mt-2">※ 사이드바에서 API 키를 먼저 검증하세요.</p>
            )}
          </div>
        </div>

        {/* 우측 결과 */}
        <div className="lg:col-span-3 bg-surface-raised border border-edge rounded-xl p-5 min-h-[400px]">
          <div className="flex items-center justify-between border-b border-edge pb-2 mb-4">
            <h2 className="text-sm font-semibold text-text">채점 결과</h2>
            {grading && (
              <PdfExport
                grading={grading}
                rubric={currentRubric}
                submission={lastSubmission}
                assignment={currentAssignment}
              />
            )}
          </div>

          {grading_loading && (
            <div className="flex items-center justify-center py-20">
              <Spinner size={32} label="채점 중..." />
            </div>
          )}

          {!grading_loading && !grading && (
            <div className="text-center py-20 text-text-subtle">
              <GraduationCap size={40} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">과제·루브릭·답안을 준비하고 "채점 실행"을 눌러보세요.</p>
            </div>
          )}

          {grading && !grading_loading && (
            <GradingReport
              grading={grading}
              rubric={currentRubric}
              submission={lastSubmission}
              assignment={currentAssignment}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function SlotCard({ label, value, emptyLabel, items, getLabel, getSubLabel, onPick, onOpen, open }) {
  return (
    <div>
      <button
        onClick={onOpen}
        className={`w-full text-left p-3 rounded-lg border transition-colors
          ${value ? 'bg-surface-sunken border-edge-strong' : 'bg-surface-sunken/50 border-dashed border-edge-strong hover:border-text-subtle'}`}
      >
        <div className="flex items-center gap-2 text-xs text-text-muted mb-1">
          <FileText size={12} /> {label}
        </div>
        <p className={`text-sm ${value ? 'text-text font-semibold' : 'text-text-subtle'}`}>
          {value || emptyLabel}
        </p>
      </button>
      {open && (
        <div className="mt-2 max-h-56 overflow-y-auto space-y-1 border border-edge rounded-lg p-2 bg-surface">
          {items.length === 0 && <p className="text-xs text-text-subtle text-center py-3">저장된 항목이 없습니다.</p>}
          {items.map((it) => (
            <button
              key={it.id}
              onClick={() => onPick(it)}
              className="w-full text-left p-2 bg-surface-sunken hover:bg-surface-muted rounded text-xs"
            >
              <p className="font-semibold text-text truncate">{getLabel(it)}</p>
              <p className="text-text-subtle mt-0.5">{getSubLabel(it)}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
