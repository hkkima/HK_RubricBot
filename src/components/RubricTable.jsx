import React, { useMemo } from 'react';
import { AlertTriangle, GripVertical, Plus, Trash2 } from 'lucide-react';

/**
 * 루브릭 기준표 표시 및 편집 컴포넌트.
 * 편집 모드에서는 표 대신 기준별 카드로 보여주어 긴 설명을 읽고 고치기 쉽게 한다.
 */
export default function RubricTable({ rubric, editable = false, onChange }) {
  const criteria = rubric?.criteria || [];

  const weightSum = useMemo(
    () => criteria.reduce((sum, c) => sum + (Number(c.weight) || 0), 0),
    [criteria],
  );
  const weightOk = weightSum === 100;

  function updateCriterion(idx, patch) {
    const next = criteria.map((c, i) => (i === idx ? { ...c, ...patch } : c));
    onChange?.({ ...rubric, criteria: next });
  }

  function updateLevel(critIdx, levelIdx, patch) {
    const next = criteria.map((c, i) => {
      if (i !== critIdx) return c;
      const levels = (c.levels || []).map((l, li) => (li === levelIdx ? { ...l, ...patch } : l));
      return { ...c, levels };
    });
    onChange?.({ ...rubric, criteria: next });
  }

  function removeCriterion(idx) {
    onChange?.({ ...rubric, criteria: criteria.filter((_, i) => i !== idx) });
  }

  function addCriterion() {
    const nextId = `c${criteria.length + 1}`;
    const sample = criteria[0]?.levels?.map((l) => ({ label: l.label, score: 0, descriptor: '' })) || [
      { label: '탁월', score: 0, descriptor: '' },
      { label: '우수', score: 0, descriptor: '' },
      { label: '보통', score: 0, descriptor: '' },
      { label: '미흡', score: 0, descriptor: '' },
      { label: '매우 미흡', score: 0, descriptor: '' },
    ];
    onChange?.({
      ...rubric,
      criteria: [...criteria, { id: nextId, name: '새 기준', description: '', weight: 0, levels: sample }],
    });
  }

  if (!editable) {
    return <ReadOnlyRubric rubric={rubric} criteria={criteria} weightSum={weightSum} weightOk={weightOk} />;
  }

  return (
    <div className="space-y-5">
      <div className="sticky top-0 z-10 -mx-1 rounded-2xl border border-edge bg-surface/95 p-4 backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <label className="text-xs uppercase tracking-[0.18em] text-text-subtle">Rubric title</label>
            <input
              type="text"
              value={rubric.title || ''}
              onChange={(e) => onChange?.({ ...rubric, title: e.target.value })}
              className="mt-2 w-full bg-surface-sunken border border-edge-strong rounded-xl px-4 py-3 text-xl font-semibold text-brand outline-none focus:border-brand"
            />
            <p className="text-sm text-text-muted mt-2">
              총점 {rubric.totalScore} · 척도 {rubric.scaleType} · 기준 {criteria.length}개
            </p>
          </div>
          <div className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${weightOk
            ? 'bg-positive-muted text-positive-fg border-positive/30'
            : 'bg-critical-muted text-critical-fg border-critical/30'}`}
          >
            가중치 합: {weightSum} / 100
          </div>
        </div>
        {!weightOk && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-caution/30 bg-caution-muted px-4 py-3 text-sm text-caution-fg">
            <AlertTriangle size={16} /> 저장하려면 가중치 합이 100이 되어야 합니다.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {criteria.map((criterion, ci) => (
          <CriterionCard
            key={`${criterion.id}-${ci}`}
            criterion={criterion}
            index={ci}
            onChange={(patch) => updateCriterion(ci, patch)}
            onLevelChange={(levelIdx, patch) => updateLevel(ci, levelIdx, patch)}
            onRemove={() => removeCriterion(ci)}
          />
        ))}
      </div>

      <button
        onClick={addCriterion}
        className="w-full rounded-2xl border border-dashed border-edge-strong bg-surface px-5 py-5 text-sm font-semibold text-brand transition-colors hover:bg-surface-muted flex items-center justify-center gap-2"
      >
        <Plus size={16} /> 평가 기준 추가
      </button>
    </div>
  );
}

function CriterionCard({ criterion, index, onChange, onLevelChange, onRemove }) {
  return (
    <section className="rounded-2xl border border-edge bg-surface p-5 lg:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex items-center gap-3 lg:w-24 shrink-0 text-text-subtle">
          <GripVertical size={16} />
          <span className="rounded-full bg-brand-muted px-3 py-1 text-xs font-semibold text-brand">
            {criterion.id || `c${index + 1}`}
          </span>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[1fr_120px]">
          <div>
            <label className="text-xs text-text-subtle">평가 기준</label>
            <input
              value={criterion.name || ''}
              onChange={(e) => onChange({ name: e.target.value })}
              className="mt-1 w-full rounded-xl border border-edge-strong bg-surface-sunken px-4 py-3 text-base font-semibold text-text outline-none focus:border-brand"
            />
          </div>
          <div>
            <label className="text-xs text-text-subtle">가중치</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="number"
                value={criterion.weight}
                onChange={(e) => onChange({ weight: parseInt(e.target.value, 10) || 0 })}
                className="w-full rounded-xl border border-edge-strong bg-surface-sunken px-4 py-3 text-base font-semibold text-text outline-none focus:border-brand"
              />
              <span className="text-sm text-text-subtle">%</span>
            </div>
          </div>
          <div className="lg:col-span-2">
            <label className="text-xs text-text-subtle">설명</label>
            <textarea
              value={criterion.description || ''}
              onChange={(e) => onChange({ description: e.target.value })}
              rows={3}
              className="mt-1 w-full rounded-xl border border-edge-strong bg-surface-sunken px-4 py-3 text-sm leading-relaxed text-text outline-none resize-y focus:border-brand"
            />
          </div>
        </div>

        <button
          onClick={onRemove}
          className="self-start rounded-full border border-edge bg-surface-sunken p-2 text-text-subtle transition-colors hover:border-critical/40 hover:text-critical-fg"
          title="기준 삭제"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="mt-5 rounded-2xl bg-surface-raised/70 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-brand">단계별 기술</h4>
          <span className="text-xs text-text-subtle">점수와 채점 설명을 함께 수정</span>
        </div>
        <div className="space-y-3">
          {(criterion.levels || []).map((level, li) => (
            <div key={`${level.label}-${li}`} className="grid grid-cols-1 gap-3 rounded-xl border border-edge bg-surface p-3 lg:grid-cols-[120px_96px_1fr] lg:items-start">
              <div>
                <label className="text-[11px] text-text-subtle">단계</label>
                <input
                  value={level.label || ''}
                  onChange={(e) => onLevelChange(li, { label: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-edge-strong bg-surface-sunken px-3 py-2 text-sm font-semibold text-brand outline-none focus:border-brand"
                />
              </div>
              <div>
                <label className="text-[11px] text-text-subtle">점수</label>
                <input
                  type="number"
                  value={level.score}
                  onChange={(e) => onLevelChange(li, { score: parseFloat(e.target.value) || 0 })}
                  className="mt-1 w-full rounded-lg border border-edge-strong bg-surface-sunken px-3 py-2 text-sm text-text outline-none focus:border-brand"
                />
              </div>
              <div>
                <label className="text-[11px] text-text-subtle">기술</label>
                <textarea
                  value={level.descriptor || ''}
                  onChange={(e) => onLevelChange(li, { descriptor: e.target.value })}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-edge-strong bg-surface-sunken px-3 py-2 text-sm leading-relaxed text-text outline-none resize-y focus:border-brand"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ReadOnlyRubric({ rubric, criteria, weightSum, weightOk }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-edge bg-surface p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-brand">{rubric.title}</h3>
            <p className="text-sm text-text-muted mt-1">
              총점 {rubric.totalScore} · 척도 {rubric.scaleType} · 기준 {criteria.length}개
            </p>
          </div>
          <div className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${weightOk
            ? 'bg-positive-muted text-positive-fg border-positive/30'
            : 'bg-critical-muted text-critical-fg border-critical/30'}`}
          >
            가중치 합: {weightSum} / 100
          </div>
        </div>
      </div>

      {criteria.map((criterion, index) => (
        <section key={`${criterion.id}-${index}`} className="rounded-2xl border border-edge bg-surface p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span className="rounded-full bg-brand-muted px-3 py-1 text-xs font-semibold text-brand">
                {criterion.id || `c${index + 1}`}
              </span>
              <h4 className="mt-3 text-lg font-semibold text-text">{criterion.name}</h4>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">{criterion.description}</p>
            </div>
            <span className="rounded-full border border-edge-strong bg-surface-sunken px-3 py-1 text-sm font-semibold text-brand">
              {criterion.weight}%
            </span>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {(criterion.levels || []).map((level, li) => (
              <div key={`${level.label}-${li}`} className="rounded-xl border border-edge bg-surface-raised/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-brand">{level.label}</p>
                  <span className="rounded-full bg-surface px-3 py-1 text-xs text-text-muted">{level.score}점</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">{level.descriptor}</p>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
