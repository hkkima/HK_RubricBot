import React, { useState, useEffect, useCallback } from 'react';
import { Library, FileText, ClipboardList, GraduationCap, RefreshCw, Copy, Check } from 'lucide-react';
import Button from '../components/common/Button.jsx';
import Spinner from '../components/common/Spinner.jsx';
import ConfirmDialog from '../components/common/ConfirmDialog.jsx';
import SavedList, { providerBadge, exportJson, exportText } from '../components/SavedList.jsx';
import MarkdownView from '../components/MarkdownView.jsx';
import RubricTable from '../components/RubricTable.jsx';
import { assignmentsStore, rubricsStore, gradingsStore } from '../lib/storage.js';
import { useWorkflow } from '../context/WorkflowContext.jsx';

const TABS = [
  { id: 'assignments', label: '과제', icon: FileText },
  { id: 'rubrics', label: '루브릭', icon: ClipboardList },
  { id: 'gradings', label: '채점 결과', icon: GraduationCap },
];

export default function LibraryPage({ notify, onNavigate }) {
  const { setCurrentAssignment, setCurrentRubric, setCurrentGrading } = useWorkflow();

  const [tab, setTab] = useState('assignments');
  const [assignments, setAssignments] = useState([]);
  const [rubrics, setRubrics] = useState([]);
  const [gradings, setGradings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [a, r, g] = await Promise.all([
        assignmentsStore.list().catch(() => []),
        rubricsStore.list().catch(() => []),
        gradingsStore.list().catch(() => []),
      ]);
      setAssignments(a);
      setRubrics(r);
      setGradings(g);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  function askDelete(type, item) {
    const labels = { assignments: '과제', rubrics: '루브릭', gradings: '채점 결과' };
    setConfirm({
      title: `${labels[type]} 삭제`,
      message: `정말 "${item.title || item.id}"을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
      onConfirm: async () => {
        try {
          if (type === 'assignments') await assignmentsStore.delete(item.id);
          else if (type === 'rubrics') await rubricsStore.delete(item.id);
          else await gradingsStore.delete(item.id);
          notify('success', '삭제되었습니다.');
          setConfirm(null);
          reload();
        } catch (err) {
          notify('error', `삭제 실패: ${err.message}`);
          setConfirm(null);
        }
      },
    });
  }

  async function cloneAssignment(item) {
    try {
      const copy = { ...item, title: `${item.title} (복제)`, source: 'imported' };
      delete copy.id; delete copy.createdAt; delete copy.updatedAt;
      await assignmentsStore.create(copy);
      notify('success', '복제되었습니다.');
      reload();
    } catch (err) {
      notify('error', `복제 실패: ${err.message}`);
    }
  }

  async function cloneRubric(item) {
    try {
      const copy = { ...item, title: `${item.title} (복제)` };
      delete copy.id; delete copy.createdAt; delete copy.updatedAt;
      await rubricsStore.create(copy);
      notify('success', '복제되었습니다.');
      reload();
    } catch (err) {
      notify('error', `복제 실패: ${err.message}`);
    }
  }

  function openAssignment(item) {
    setCurrentAssignment(item);
    notify('success', `"${item.title}" 불러옴 → 루브릭 페이지로 이동합니다.`);
    onNavigate?.('rubric');
  }

  function openRubric(item) {
    setCurrentRubric(item);
    if (item.assignmentId) {
      const linked = assignments.find((a) => a.id === item.assignmentId);
      if (linked) setCurrentAssignment(linked);
    }
    notify('success', `"${item.title}" 불러옴 → 채점 페이지로 이동합니다.`);
    onNavigate?.('grading');
  }

  function openGrading(item) {
    setCurrentGrading(item);
    setPreview({ type: 'gradings', item });
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text flex items-center gap-2">
            <Library className="text-info" /> 보관함
          </h1>
          <p className="text-sm text-text-muted mt-1">저장된 과제·루브릭·채점 결과를 관리합니다. 모두 이 브라우저의 IndexedDB에만 저장됩니다.</p>
        </div>
        <Button variant="outline" size="sm" icon={RefreshCw} onClick={reload} loading={loading}>
          새로고침
        </Button>
      </div>

      <div className="flex gap-2 border-b border-edge mb-5">
        {TABS.map((t) => {
          const counts = { assignments: assignments.length, rubrics: rubrics.length, gradings: gradings.length };
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors
                ${tab === t.id ? 'border-brand-hover text-info-fg' : 'border-transparent text-text-muted hover:text-text'}`}
            >
              <t.icon size={14} /> {t.label}
              <span className="text-[10px] px-1.5 py-0.5 bg-surface-sunken rounded text-text-muted">{counts[t.id]}</span>
            </button>
          );
        })}
      </div>

      {loading && !assignments.length && !rubrics.length && !gradings.length ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size={32} label="불러오는 중..." />
        </div>
      ) : (
        <>
          {tab === 'assignments' && (
            <SavedList
              items={assignments}
              getTitle={(a) => a.title}
              getSubtitle={(a) => [a.subject, a.audience, a.difficulty].filter(Boolean).join(' · ')}
              getBadge={(a) => providerBadge(a.provider)}
              onOpen={(a) => setPreview({ type: 'assignments', item: a })}
              onClone={cloneAssignment}
              onExport={(a) => exportJson(`assignment-${a.title}`, a)}
              onDelete={(a) => askDelete('assignments', a)}
              emptyLabel="저장된 과제가 없습니다. '과제 생성' 탭에서 먼저 만들어보세요."
            />
          )}
          {tab === 'rubrics' && (
            <SavedList
              items={rubrics}
              getTitle={(r) => r.title}
              getSubtitle={(r) => {
                const linked = assignments.find((a) => a.id === r.assignmentId);
                const parts = [
                  `${(r.criteria || []).length}개 기준`,
                  `총점 ${r.totalScore}`,
                  r.scaleType,
                ];
                if (linked) parts.push(`과제: ${linked.title}`);
                return parts.join(' · ');
              }}
              getBadge={(r) => providerBadge(r.provider)}
              onOpen={(r) => setPreview({ type: 'rubrics', item: r })}
              onClone={cloneRubric}
              onExport={(r) => exportJson(`rubric-${r.title}`, r)}
              onDelete={(r) => askDelete('rubrics', r)}
              emptyLabel="저장된 루브릭이 없습니다."
            />
          )}
          {tab === 'gradings' && (
            <SavedList
              items={gradings}
              getTitle={(g) => {
                const student = g.submission?.studentName;
                const assignment = assignments.find((a) => a.id === g.assignmentId);
                const base = assignment?.title || '채점';
                return student ? `${base} — ${student}` : base;
              }}
              getSubtitle={(g) => {
                const rubric = rubrics.find((r) => r.id === g.rubricId);
                const parts = ['Markdown 요약 저장됨'];
                if (rubric) parts.push(`루브릭: ${rubric.title}`);
                if (g.submission?.studentName) parts.push(`학생: ${g.submission.studentName}`);
                return parts.join(' · ');
              }}
              getBadge={(g) => providerBadge(g.provider)}
              onOpen={openGrading}
              onExport={(g) => exportText(`grading-${g.id.slice(0, 8)}`, g.markdown || '', 'text/markdown', 'md')}
              onDelete={(g) => askDelete('gradings', g)}
              emptyLabel="저장된 채점 결과가 없습니다."
            />
          )}
        </>
      )}

      {preview && (
        <PreviewModal
          preview={preview}
          assignments={assignments}
          rubrics={rubrics}
          onClose={() => setPreview(null)}
          onUse={(type, item) => {
            setPreview(null);
            if (type === 'assignments') openAssignment(item);
            else if (type === 'rubrics') openRubric(item);
          }}
        />
      )}

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title || ''}
        message={confirm?.message || ''}
        onConfirm={confirm?.onConfirm}
        onCancel={() => setConfirm(null)}
        confirmLabel="삭제"
        danger
      />
    </div>
  );
}

function PreviewModal({ preview, assignments, rubrics, onClose, onUse }) {
  const { type, item } = preview;

  return (
    <div className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-surface border border-edge rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-edge px-5 py-3">
          <h2 className="text-base font-semibold text-text truncate">{item.title || '상세'}</h2>
          <div className="flex items-center gap-2">
            {type !== 'gradings' && (
              <Button size="sm" onClick={() => onUse(type, item)}>
                {type === 'assignments' ? '루브릭 만들기에 사용' : '채점에 사용'}
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={onClose}>닫기</Button>
          </div>
        </div>
        <div className="overflow-y-auto p-5">
          {type === 'assignments' && <AssignmentDetail item={item} />}
          {type === 'rubrics' && <RubricTable rubric={item} />}
          {type === 'gradings' && <MarkdownPreview item={item} />}
        </div>
      </div>
    </div>
  );
}

function MarkdownPreview({ item }) {
  const [copied, setCopied] = useState(false);
  const markdown = item.markdown || '';

  async function copyMarkdown() {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-edge bg-surface-raised p-4">
        <div>
          <h3 className="text-sm font-semibold text-brand">Markdown 채점 요약</h3>
          <p className="text-xs text-text-muted mt-1">보관함에는 강점, 개선할 점, 총평만 저장됩니다.</p>
        </div>
        <Button size="sm" icon={copied ? Check : Copy} onClick={copyMarkdown}>
          {copied ? '복사됨' : 'MD 복사'}
        </Button>
      </div>
      <pre className="whitespace-pre-wrap rounded-2xl border border-edge bg-surface p-5 text-sm leading-relaxed text-text">
        {markdown || '(저장된 Markdown이 없습니다.)'}
      </pre>
    </div>
  );
}

function AssignmentDetail({ item }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-xs">
        {item.subject && <Chip>과목: {item.subject}</Chip>}
        {item.audience && <Chip>대상: {item.audience}</Chip>}
        {item.difficulty && <Chip>난이도: {item.difficulty}</Chip>}
        {item.submissionFormat && <Chip>제출 양식: {item.submissionFormat}</Chip>}
        {item.dueDate && <Chip>기한: {item.dueDate}</Chip>}
      </div>
      {(item.objectives || []).length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-text-muted mb-1">학습 목표</h3>
          <ul className="list-disc list-inside text-sm text-text space-y-0.5">
            {item.objectives.map((o, i) => <li key={i}>{o}</li>)}
          </ul>
        </section>
      )}
      {item.instructions && (
        <section>
          <h3 className="text-xs font-semibold text-text-muted mb-1">과제 지시문</h3>
          <MarkdownView text={item.instructions} />
        </section>
      )}
      {(item.integrityNotes || []).length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-text-muted mb-1">학업 성실성 안내</h3>
          <ul className="list-disc list-inside text-sm text-text-muted space-y-0.5">
            {item.integrityNotes.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        </section>
      )}
    </div>
  );
}

function Chip({ children }) {
  return <span className="px-2 py-0.5 bg-surface-sunken border border-edge-strong rounded text-text-muted">{children}</span>;
}
