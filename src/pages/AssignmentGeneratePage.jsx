import React, { useState } from 'react';
import { Sparkles, Save, ArrowRight, FileEdit, Plus, X } from 'lucide-react';
import Button from '../components/common/Button.jsx';
import Spinner from '../components/common/Spinner.jsx';
import MarkdownView from '../components/MarkdownView.jsx';
import FileDropZone from '../components/FileDropZone.jsx';
import { generateAssignment } from '../lib/grade.js';
import { assignmentsStore } from '../lib/storage.js';
import { useApi } from '../hooks/useApi.js';
import { useWorkflow } from '../context/WorkflowContext.jsx';

const DIFFICULTIES = [
  { id: '쉬움', label: '쉬움', desc: '500~800자, 1~2시간' },
  { id: '보통', label: '보통', desc: '1000~1500자, 3~5시간' },
  { id: '어려움', label: '어려움', desc: '2000자+, 1~2주' },
];

export default function AssignmentGeneratePage({ modelSelector, notify, onNavigate }) {
  const { setCurrentAssignment } = useWorkflow();

  const [subject, setSubject] = useState('');
  const [audience, setAudience] = useState('');
  const [difficulty, setDifficulty] = useState('보통');
  const [goals, setGoals] = useState([]);
  const [goalInput, setGoalInput] = useState('');
  const [referenceText, setReferenceText] = useState('');
  const [constraints, setConstraints] = useState('');
  const [preview, setPreview] = useState(null); // 생성 후 아직 저장 안 한 미리보기

  const { run: generate, loading: generating } = useApi(generateAssignment);
  const { run: save, loading: saving } = useApi(assignmentsStore.create);

  function addGoal() {
    const v = goalInput.trim();
    if (!v) return;
    setGoals([...goals, v]);
    setGoalInput('');
  }

  function removeGoal(i) {
    setGoals(goals.filter((_, idx) => idx !== i));
  }

  function canGenerate() {
    if (!subject.trim()) return false;
    if (modelSelector.keyStatus !== 'valid') return false;
    return true;
  }

  async function handleGenerate() {
    if (!canGenerate()) {
      notify('error', modelSelector.keyStatus !== 'valid' ? '먼저 API 키를 검증하세요.' : '주제를 입력하세요.');
      return;
    }
    try {
      const assignment = await generate({
        ...modelSelector.payload,
        direction: { subject, audience, difficulty, goals, referenceText, constraints },
      });
      setPreview(assignment);
      notify('success', '과제 초안이 생성되었습니다. 내용을 확인 후 저장하세요.');
    } catch (err) {
      notify('error', `생성 실패: ${err.message}`);
    }
  }

  async function handleSave() {
    if (!preview) return;
    try {
      const saved = await save({ ...preview });
      setCurrentAssignment(saved);
      setPreview(saved);
      notify('success', '보관함에 저장되었습니다.');
    } catch (err) {
      notify('error', `저장 실패: ${err.message}`);
    }
  }

  function handleGoToRubric() {
    if (!preview?.id) {
      notify('error', '먼저 과제를 저장하세요.');
      return;
    }
    setCurrentAssignment(preview);
    onNavigate('rubric');
  }

  function handleRefUpload(result) {
    setReferenceText((prev) => (prev ? prev + '\n\n' : '') + `[${result.filename}]\n${result.text}`);
    notify('success', `"${result.filename}" 파싱 완료 (${result.charCount.toLocaleString()}자)`);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text flex items-center gap-2">
          <FileEdit className="text-brand-hover" /> 과제 생성
        </h1>
        <p className="text-sm text-text-muted mt-1">방향성(주제·대상·난이도·목표)만 입력하면 LLM이 정식 과제로 완성합니다.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 입력 폼 */}
        <div className="space-y-4 bg-surface-raised border border-edge rounded-xl p-5">
          <h2 className="text-sm font-semibold text-text border-b border-edge pb-2">방향성 입력</h2>

          <div>
            <label className="text-xs text-text-muted">주제 <span className="text-critical-fg">*</span></label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="예: 재생에너지 정책 비교 분석"
              className="mt-1 w-full bg-surface-sunken border border-edge-strong rounded-lg px-3 py-2 text-sm text-text focus:border-brand outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-text-muted">대상 학습자</label>
            <input
              type="text"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="예: 대학교 2학년 / 신입사원"
              className="mt-1 w-full bg-surface-sunken border border-edge-strong rounded-lg px-3 py-2 text-sm text-text focus:border-brand outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-text-muted">난이도</label>
            <div className="mt-1 grid grid-cols-3 gap-2">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDifficulty(d.id)}
                  className={`p-2 rounded-lg border text-center text-xs
                    ${difficulty === d.id
                      ? 'bg-brand border-brand text-brand-fg'
                      : 'bg-surface-sunken border-edge-strong text-text-muted hover:border-text-subtle'}`}
                >
                  <div className="font-semibold">{d.label}</div>
                  <div className="text-[10px] opacity-80 mt-0.5">{d.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-text-muted">학습 목표 키워드 (선택)</label>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addGoal(); } }}
                placeholder="예: 정책 비교, 데이터 해석 (Enter로 추가)"
                className="flex-1 bg-surface-sunken border border-edge-strong rounded-lg px-3 py-2 text-sm text-text focus:border-brand outline-none"
              />
              <Button onClick={addGoal} icon={Plus} variant="secondary" size="sm">추가</Button>
            </div>
            {goals.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {goals.map((g, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-surface-sunken border border-edge-strong rounded text-xs text-text">
                    {g}
                    <button onClick={() => removeGoal(i)} className="text-text-subtle hover:text-critical-fg">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-xs text-text-muted flex items-center justify-between">
              <span>참고 자료 (선택)</span>
              <FileDropZone compact onParsed={handleRefUpload} onError={(e) => notify('error', e.message)} />
            </label>
            <textarea
              value={referenceText}
              onChange={(e) => setReferenceText(e.target.value)}
              placeholder="과제의 맥락이 되는 자료/텍스트. PDF·MD 업로드도 가능."
              rows={4}
              className="mt-1 w-full bg-surface-sunken border border-edge-strong rounded-lg px-3 py-2 text-sm text-text focus:border-brand outline-none resize-none"
            />
          </div>

          <div>
            <label className="text-xs text-text-muted">제약 / 요청 사항 (선택)</label>
            <textarea
              value={constraints}
              onChange={(e) => setConstraints(e.target.value)}
              placeholder="예: 분량 1500자 내, 외부 인용 필수, AI 도구 사용 금지"
              rows={2}
              className="mt-1 w-full bg-surface-sunken border border-edge-strong rounded-lg px-3 py-2 text-sm text-text focus:border-brand outline-none resize-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleGenerate}
              loading={generating}
              disabled={!canGenerate()}
              icon={Sparkles}
              className="flex-1"
            >
              과제 생성
            </Button>
          </div>
          {modelSelector.keyStatus !== 'valid' && (
            <p className="text-[11px] text-caution-fg">※ 사이드바에서 API 키를 먼저 검증하세요.</p>
          )}
        </div>

        {/* 프리뷰 */}
        <div className="bg-surface-raised border border-edge rounded-xl p-5">
          <div className="flex items-center justify-between border-b border-edge pb-2 mb-3">
            <h2 className="text-sm font-semibold text-text">
              {preview ? (preview.id ? '저장됨' : '미리보기') : '프리뷰'}
            </h2>
            {preview && (
              <div className="flex gap-2">
                <Button onClick={handleSave} loading={saving} disabled={!!preview.id} icon={Save} variant="success" size="sm">
                  {preview.id ? '저장됨' : '저장'}
                </Button>
                <Button onClick={handleGoToRubric} icon={ArrowRight} variant="primary" size="sm" disabled={!preview.id}>
                  루브릭 만들기
                </Button>
              </div>
            )}
          </div>

          {generating && (
            <div className="flex items-center justify-center py-16">
              <Spinner size={32} label="과제 생성 중..." />
            </div>
          )}

          {!generating && !preview && (
            <div className="text-center py-16 text-text-subtle">
              <FileEdit size={36} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">방향성을 입력하고 "과제 생성" 버튼을 눌러보세요.</p>
            </div>
          )}

          {preview && !generating && <AssignmentPreview assignment={preview} />}
        </div>
      </div>
    </div>
  );
}

function AssignmentPreview({ assignment }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-text">{assignment.title}</h3>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {assignment.subject && <Tag>{assignment.subject}</Tag>}
          {assignment.audience && <Tag>{assignment.audience}</Tag>}
          {assignment.difficulty && <Tag variant="difficulty">{assignment.difficulty}</Tag>}
        </div>
      </div>

      {Array.isArray(assignment.objectives) && assignment.objectives.length > 0 && (
        <section>
          <h4 className="text-xs uppercase tracking-wider text-text-subtle mb-1.5">학습 목표</h4>
          <ul className="list-disc pl-5 space-y-1 text-sm text-text-muted">
            {assignment.objectives.map((o, i) => <li key={i}>{o}</li>)}
          </ul>
        </section>
      )}

      <section>
        <h4 className="text-xs uppercase tracking-wider text-text-subtle mb-1.5">지시사항</h4>
        <MarkdownView>{assignment.instructions}</MarkdownView>
      </section>

      {Array.isArray(assignment.subtasks) && assignment.subtasks.length > 0 && (
        <section>
          <h4 className="text-xs uppercase tracking-wider text-text-subtle mb-1.5">세부 단계</h4>
          <ol className="list-decimal pl-5 space-y-1.5 text-sm text-text-muted">
            {assignment.subtasks.map((t, i) => (
              <li key={i}><span className="font-semibold text-text">{t.title}</span> — {t.description}</li>
            ))}
          </ol>
        </section>
      )}

      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-edge">
        <Info label="제출 양식" value={assignment.submissionFormat} />
        <Info label="제출 기한" value={assignment.dueDate} />
      </div>

      {Array.isArray(assignment.integrityNotes) && assignment.integrityNotes.length > 0 && (
        <section>
          <h4 className="text-xs uppercase tracking-wider text-text-subtle mb-1.5">공정성 · 제약</h4>
          <ul className="list-disc pl-5 space-y-1 text-xs text-caution-fg/90">
            {assignment.integrityNotes.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        </section>
      )}
    </div>
  );
}

function Tag({ children, variant = 'default' }) {
  const colors = {
    default:    'bg-surface-sunken text-text-muted border-edge-strong',
    difficulty: 'bg-brand-muted/50 text-info-fg border-brand/40',
  };
  return <span className={`inline-block text-[11px] px-2 py-0.5 rounded border ${colors[variant]}`}>{children}</span>;
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-text-subtle">{label}</p>
      <p className="text-sm text-text mt-0.5">{value || '(미지정)'}</p>
    </div>
  );
}
