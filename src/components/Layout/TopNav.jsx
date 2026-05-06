import React from 'react';
import { ClipboardList, GraduationCap, Check } from 'lucide-react';
import { useWorkflow } from '../../context/WorkflowContext.jsx';

const STEPS = [
  { id: 'rubric',  label: '루브릭 생성', icon: ClipboardList, order: 1 },
  { id: 'grading', label: '채점',       icon: GraduationCap, order: 2 },
];

export default function TopNav({ activePage, onChange }) {
  const { currentAssignment, currentRubric } = useWorkflow();

  function stepStatus(id) {
    if (id === 'rubric')     return currentRubric ? 'done' : 'ready';
    if (id === 'grading')    return (currentAssignment && currentRubric) ? 'ready' : 'locked';
    return 'pending';
  }

  return (
    <header className="border-b border-edge bg-surface-raised/80 backdrop-blur-sm sticky top-0 z-30">
      <div className="flex items-center px-6 h-16 gap-6">
        <div className="flex items-center gap-2 text-text font-bold">
          <span className="w-7 h-7 rounded-full bg-brand text-brand-fg flex items-center justify-center text-xs">AB</span>
          <span>AssignmentBot</span>
        </div>

        <div className="flex items-center gap-1 flex-1">
          {STEPS.map((s, idx) => {
            const status = stepStatus(s.id);
            const active = activePage === s.id;
            const Icon = s.icon;
            return (
              <React.Fragment key={s.id}>
                <button
                  onClick={() => onChange(s.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors
                    ${active ? 'bg-brand text-brand-fg'
                      : status === 'done' ? 'bg-positive-muted/40 text-positive-fg hover:bg-positive-muted/60'
                      : status === 'ready' ? 'bg-surface-sunken text-text hover:bg-surface-muted'
                      : 'text-text-subtle hover:text-text-muted'}`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
                    ${status === 'done' ? 'bg-positive text-white'
                      : active ? 'bg-white text-brand'
                      : 'bg-surface-muted text-text-muted'}`}>
                    {status === 'done' ? <Check size={10} /> : s.order}
                  </span>
                  <Icon size={15} />
                  {s.label}
                </button>
                {idx < STEPS.length - 1 && (
                  <div className="w-6 h-px bg-edge-strong" />
                )}
              </React.Fragment>
            );
          })}
        </div>

        <div className="text-xs text-text-subtle">보관함은 좌측 패널에서 열 수 있습니다.</div>
      </div>

      {(currentAssignment || currentRubric) && (
        <div className="px-6 py-2 border-t border-edge flex items-center gap-3 text-[11px] text-text-muted">
          {currentAssignment && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-surface-sunken rounded">
              과제: {currentAssignment.title}
            </span>
          )}
          {currentRubric && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-surface-sunken rounded">
              <ClipboardList size={11} className="text-positive" /> 루브릭: {currentRubric.title}
            </span>
          )}
        </div>
      )}
    </header>
  );
}
