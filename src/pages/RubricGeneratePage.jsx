import React, { useState, useEffect } from 'react';
import { Sparkles, Save, ArrowRight, ClipboardList } from 'lucide-react';
import Button from '../components/common/Button.jsx';
import Spinner from '../components/common/Spinner.jsx';
import FileDropZone from '../components/FileDropZone.jsx';
import RubricTable from '../components/RubricTable.jsx';
import { generateRubric } from '../lib/grade.js';
import { assignmentsStore, rubricsStore } from '../lib/storage.js';
import { useApi } from '../hooks/useApi.js';
import { useWorkflow } from '../context/WorkflowContext.jsx';

const SCALE_TYPES = [
  { id: '3-level', label: '3단계 (우수/보통/미흡)' },
  { id: '4-level', label: '4단계 (탁월/우수/보통/미흡)' },
  { id: '5-level', label: '5단계 (탁월/우수/보통/미흡/매우미흡)' },
];

const RUBRIC_MODES = [
  {
    id: 'precise',
    label: '정밀 (정량 계측)',
    desc: '수치 임계값·체크리스트 기반. 채점자 간 일치도 우선.',
  },
  {
    id: 'lite',
    label: '경량 (정성 평가)',
    desc: '서술형 기준. 글쓰기·창의성처럼 수치화가 부자연스러운 항목용.',
  },
];

export default function RubricGeneratePage({ modelSelector, notify, onNavigate }) {
  const { currentAssignment, setCurrentAssignment, setCurrentRubric } = useWorkflow();

  const [sourceMode, setSourceMode] = useState(currentAssignment ? 'current' : 'manual');
  const [savedAssignments, setSavedAssignments] = useState([]);
  const [manualTitle, setManualTitle] = useState('');
  const [manualInstructions, setManualInstructions] = useState('');
  const [manualObjectives, setManualObjectives] = useState('');
  const [manualAttachments, setManualAttachments] = useState([]);

  const [scaleType, setScaleType] = useState('5-level');
  const [totalScore, setTotalScore] = useState(100);
  const [criteriaHint, setCriteriaHint] = useState('');
  const [rubricMode, setRubricMode] = useState('precise');

  const [rubric, setRubric] = useState(null);

  const { run: generate, loading: generating } = useApi(generateRubric);
  const { run: save, loading: saving } = useApi(rubricsStore.create);
  const { run: saveAssignment } = useApi(assignmentsStore.create);

  useEffect(() => {
    if (sourceMode === 'library') {
      assignmentsStore.list().then((items) => setSavedAssignments(items)).catch(() => {});
    }
  }, [sourceMode]);

  function buildAssignmentInput() {
    if (sourceMode === 'current' && currentAssignment) return currentAssignment;
    if (sourceMode === 'library') return null;
    if (sourceMode === 'manual') {
      return {
        title: manualTitle,
        instructions: manualInstructions,
        objectives: manualObjectives ? manualObjectives.split('\n').map((s) => s.trim()).filter(Boolean) : [],
      };
    }
    return null;
  }

  function canGenerate() {
    if (modelSelector.keyStatus !== 'valid') return false;
    const src = buildAssignmentInput();
    if (!src || !src.title || !src.instructions) return false;
    return true;
  }

  function handleFileUpload(result) {
    setManualInstructions(result.text);
    setManualAttachments(result.attachments || []);
    if (!manualTitle) {
      const base = result.filename.replace(/\.[^.]+$/, '');
      setManualTitle(base);
    }
    notify('success', `"${result.filename}" 파싱 완료 (${result.charCount.toLocaleString()}자)`);
  }

  async function handleGenerate() {
    if (!canGenerate()) {
      notify('error', modelSelector.keyStatus !== 'valid' ? 'API 키 검증 필요' : '과제 정보가 부족합니다.');
      return;
    }
    let assignment = buildAssignmentInput();

    // manual 모드: 과제를 먼저 저장 → 루브릭과 연결
    if (sourceMode === 'manual') {
      try {
        assignment = await saveAssignment({
          title: assignment.title,
          instructions: assignment.instructions,
          objectives: assignment.objectives,
          source: 'imported',
        });
        setCurrentAssignment(assignment);
      } catch (err) {
        notify('error', `과제 저장 실패: ${err.message}`);
        return;
      }
    }

    try {
      const generated = await generate({
        ...modelSelector.payload,
        assignment,
        options: { scaleType, totalScore, criteriaHint, mode: rubricMode },
        files: sourceMode === 'manual' ? manualAttachments : [],
      });
      setRubric({ ...generated, assignmentId: assignment.id });
      notify('success', '루브릭 초안 생성 완료. 검토 후 저장하세요.');
    } catch (err) {
      notify('error', `생성 실패: ${err.message}`);
    }
  }

  async function handleSave() {
    if (!rubric) return;
    const weightSum = (rubric.criteria || []).reduce((s, c) => s + (Number(c.weight) || 0), 0);
    if (weightSum !== 100) {
      notify('error', `가중치 합(${weightSum})이 100이 아닙니다.`);
      return;
    }
    try {
      // 이미 저장된 루브릭이면 update, 아니면 create
      const saved = rubric.id
        ? await rubricsStore.update(rubric.id, {
            title: rubric.title,
            criteria: rubric.criteria,
            totalScore: rubric.totalScore,
            scaleType: rubric.scaleType,
            assignmentId: rubric.assignmentId || currentAssignment?.id || null,
          })
        : await save({
            title: rubric.title,
            criteria: rubric.criteria,
            totalScore: rubric.totalScore,
            scaleType: rubric.scaleType,
            assignmentId: rubric.assignmentId || currentAssignment?.id || null,
            provider: modelSelector.selectedProvider,
            modelId: modelSelector.selectedModelId,
          });
      setRubric(saved);
      setCurrentRubric(saved);
      notify('success', '보관함에 저장되었습니다.');
    } catch (err) {
      notify('error', `저장 실패: ${err.message}`);
    }
  }

  function handleGoToGrading() {
    if (!rubric?.id) {
      notify('error', '먼저 루브릭을 저장하세요.');
      return;
    }
    setCurrentRubric(rubric);
    onNavigate('grading');
  }

  return (
    <div className="p-6 lg:p-10 max-w-[1500px] mx-auto">
      <div className="mb-8 rounded-2xl bg-brand text-brand-fg p-8 lg:p-10">
        <p className="text-xs uppercase tracking-[0.22em] opacity-75 mb-4">Rubric Studio</p>
        <h1 className="font-heading text-4xl lg:text-5xl font-normal tracking-tight flex items-center gap-3">
          <ClipboardList size={34} /> 루브릭 생성
        </h1>
        <p className="text-base lg:text-lg opacity-85 mt-4 max-w-3xl leading-relaxed">
          과제 내용을 기준으로 평가 항목, 가중치, 단계별 기술을 생성하고 한 화면에서 편집합니다.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8">
        {/* 좌측: 소스 + 옵션 */}
        <div className="xl:col-span-4 space-y-6">
          <div className="bg-surface-raised border border-edge rounded-2xl p-6 lg:p-8">
            <div className="mb-5">
              <h2 className="text-xl font-semibold text-brand">과제 소스</h2>
              <p className="text-sm text-text-muted mt-1">직접 입력하거나 저장된 과제를 불러와 루브릭을 설계합니다.</p>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-5">
              {[
                { id: 'current', label: '현재 선택된 과제', disabled: !currentAssignment },
                { id: 'library', label: '보관함에서' },
                { id: 'manual',  label: '직접 입력' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => !t.disabled && setSourceMode(t.id)}
                  disabled={t.disabled}
                  className={`py-2.5 text-xs rounded-full border transition-colors
                    ${sourceMode === t.id ? 'bg-brand border-brand text-brand-fg'
                      : t.disabled ? 'bg-surface-sunken/50 border-edge text-text-subtle cursor-not-allowed'
                      : 'bg-surface-sunken border-edge-strong text-text-muted hover:border-text-subtle'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {sourceMode === 'current' && currentAssignment && (
              <div className="p-4 bg-surface border border-edge rounded-xl text-xs">
                <p className="font-semibold text-text">{currentAssignment.title}</p>
                <p className="text-text-muted mt-1 line-clamp-3">{currentAssignment.instructions?.slice(0, 200)}...</p>
              </div>
            )}

            {sourceMode === 'library' && (
              <div className="max-h-72 overflow-y-auto space-y-2">
                {savedAssignments.length === 0 && <p className="text-xs text-text-subtle text-center py-4">저장된 과제가 없습니다.</p>}
                {savedAssignments.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => { setCurrentAssignment(a); setSourceMode('current'); }}
                    className="w-full text-left p-3 bg-surface-sunken hover:bg-surface-muted rounded-xl border border-edge text-xs"
                  >
                    <p className="font-semibold text-text truncate">{a.title}</p>
                    <p className="text-text-subtle mt-0.5">{a.subject || '-'} · {a.difficulty || '-'}</p>
                  </button>
                ))}
              </div>
            )}

            {sourceMode === 'manual' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-text-muted">파일에서 가져오기</label>
                  <FileDropZone compact onParsed={handleFileUpload} onError={(e) => notify('error', e.message)} />
                </div>
                <div>
                  <label className="text-xs text-text-muted">과제 제목</label>
                  <input
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    placeholder="예: AI 기초 활용 실습"
                    className="mt-1 w-full bg-surface-sunken border border-edge-strong rounded-xl px-4 py-3 text-sm text-text focus:border-brand outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-text-muted">평가 기준</label>
                  <textarea
                    value={manualObjectives}
                    onChange={(e) => setManualObjectives(e.target.value)}
                    placeholder="한 줄에 하나씩 입력하세요. 예: 문제 해결 과정의 타당성"
                    rows={4}
                    className="mt-1 w-full bg-surface-sunken border border-edge-strong rounded-xl px-4 py-3 text-sm text-text resize-y focus:border-brand outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-text-muted">과제 지시사항</label>
                  <textarea
                    value={manualInstructions}
                    onChange={(e) => setManualInstructions(e.target.value)}
                    placeholder="학생에게 제공된 과제 지시문 또는 평가 대상 문서를 붙여넣으세요."
                    rows={12}
                    className="mt-1 w-full bg-surface-sunken border border-edge-strong rounded-xl px-4 py-3 text-sm text-text resize-y font-mono leading-relaxed focus:border-brand outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="bg-surface border border-edge rounded-2xl p-6 lg:p-8">
            <div className="mb-5">
              <h2 className="text-xl font-semibold text-brand">루브릭 옵션</h2>
              <p className="text-sm text-text-muted mt-1">기본은 5단계 척도와 100점 만점입니다.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-text-muted">평가 모드</label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  {RUBRIC_MODES.map((m) => {
                    const selected = rubricMode === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setRubricMode(m.id)}
                        className={`text-left px-3 py-2.5 rounded-xl border transition-colors
                          ${selected
                            ? 'bg-brand border-brand text-brand-fg'
                            : 'bg-surface-sunken border-edge-strong text-text-muted hover:border-text-subtle'}`}
                      >
                        <p className="text-xs font-semibold">{m.label}</p>
                        <p className={`text-[11px] mt-1 leading-snug ${selected ? 'opacity-85' : 'text-text-subtle'}`}>
                          {m.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-text-subtle mt-1.5">
                  기본값은 정밀 모드입니다. 글쓰기·창의 과제에서는 경량 모드가 더 자연스러울 수 있습니다.
                </p>
              </div>

              <div>
                <label className="text-xs text-text-muted">척도</label>
                <select
                  value={scaleType}
                  onChange={(e) => setScaleType(e.target.value)}
                  className="mt-1 w-full bg-surface-sunken border border-edge-strong rounded-xl px-4 py-3 text-sm text-text focus:border-brand outline-none"
                >
                  {SCALE_TYPES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-text-muted">총점</label>
                <input
                  type="number"
                  value={totalScore}
                  onChange={(e) => setTotalScore(parseInt(e.target.value) || 100)}
                  className="mt-1 w-full bg-surface-sunken border border-edge-strong rounded-xl px-4 py-3 text-sm text-text focus:border-brand outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-text-muted">추가 요구사항 (선택)</label>
                <textarea
                  value={criteriaHint}
                  onChange={(e) => setCriteriaHint(e.target.value)}
                  placeholder="예: 창의성 기준 반드시 포함, 근거 인용 평가 강화"
                  rows={3}
                  className="mt-1 w-full bg-surface-sunken border border-edge-strong rounded-xl px-4 py-3 text-sm text-text resize-y focus:border-brand outline-none"
                />
              </div>

              <Button
                onClick={handleGenerate}
                loading={generating}
                disabled={!canGenerate()}
                icon={Sparkles}
                className="w-full"
              >
                루브릭 생성
              </Button>
              {modelSelector.keyStatus !== 'valid' && (
                <p className="text-[11px] text-caution-fg">※ 사이드바에서 API 키를 먼저 검증하세요.</p>
              )}
            </div>
          </div>
        </div>

        {/* 우측: 루브릭 프리뷰/편집 */}
        <div className="xl:col-span-8 bg-surface-raised border border-edge rounded-2xl p-5 lg:p-8 min-h-[720px]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-edge pb-5 mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-brand">평가표 편집</h2>
              <p className="text-sm text-text-muted mt-1">생성된 기준과 레벨 설명을 카드 단위로 검토하고 수정합니다.</p>
            </div>
            {rubric && (
              <div className="flex gap-2">
                <Button onClick={handleSave} loading={saving} icon={Save} variant="success" size="sm">
                  {rubric.id ? '업데이트' : '저장'}
                </Button>
                <Button onClick={handleGoToGrading} icon={ArrowRight} variant="primary" size="sm" disabled={!rubric.id}>
                  채점으로
                </Button>
              </div>
            )}
          </div>

          {generating && (
            <div className="flex items-center justify-center py-16">
              <Spinner size={32} label="루브릭 설계 중..." />
            </div>
          )}

          {!generating && !rubric && (
            <div className="text-center py-16 text-text-subtle">
              <ClipboardList size={36} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">좌측에서 과제를 선택하고 "루브릭 생성"을 눌러보세요.</p>
            </div>
          )}

          {rubric && !generating && (
            <RubricTable rubric={rubric} editable onChange={setRubric} />
          )}
        </div>
      </div>
    </div>
  );
}
