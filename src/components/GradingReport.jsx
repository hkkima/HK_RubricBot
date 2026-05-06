import React, { useMemo, useState } from 'react';
import { CheckCircle2, TrendingUp, TrendingDown, Quote, Lightbulb, Copy, Check } from 'lucide-react';
import { buildGradingMarkdown } from '../lib/gradingMarkdown.js';

export default function GradingReport({ grading, rubric, submission, assignment }) {
  if (!grading) return null;
  const { totalScore, maxScore, criterionScores = [], overallComment, strengths = [], improvements = [] } = grading;
  const percent = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  const markdown = useMemo(() => grading.markdown || buildGradingMarkdown(grading), [grading]);

  return (
    <div className="space-y-6 print-area">
      {/* 총점 */}
      <div className="flex items-center gap-6 p-5 bg-surface-raised border border-edge rounded-xl">
        <ScoreGauge percent={percent} score={totalScore} max={maxScore} />
        <div className="flex-1">
          <h3 className="text-sm uppercase tracking-wider text-text-subtle mb-1">채점 결과</h3>
          <p className="text-lg font-bold text-text">{assignment?.title || '과제'}</p>
          <p className="text-xs text-text-muted mt-1">
            {submission?.studentName ? `학생: ${submission.studentName} · ` : ''}
            {rubric ? `루브릭: ${rubric.title}` : ''}
          </p>
        </div>
      </div>

      {/* 기준별 점수 */}
      <section className="bg-surface-raised border border-edge rounded-xl p-5">
        <h3 className="text-sm font-semibold text-text mb-4">기준별 점수</h3>
        <div className="space-y-4">
          {criterionScores.map((cs, i) => (
            <CriterionBlock key={i} criterion={cs} rubric={rubric} />
          ))}
        </div>
      </section>

      {/* 총평 */}
      {overallComment && (
        <section className="bg-surface-raised border border-edge rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text mb-3">총평</h3>
          <p className="text-sm text-text leading-relaxed whitespace-pre-line">{overallComment}</p>
        </section>
      )}

      {/* 강점 · 개선 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="bg-surface-raised border border-edge rounded-xl p-5">
          <h3 className="text-sm font-semibold text-positive-fg mb-3 flex items-center gap-1">
            <TrendingUp size={16} /> 강점
          </h3>
          <ul className="space-y-2 text-sm text-text">
            {strengths.length === 0 && <li className="text-text-subtle text-xs">(없음)</li>}
            {strengths.map((s, i) => (
              <li key={i} className="flex gap-2">
                <CheckCircle2 size={14} className="text-positive mt-0.5 shrink-0" />{s}
              </li>
            ))}
          </ul>
        </section>
        <section className="bg-surface-raised border border-edge rounded-xl p-5">
          <h3 className="text-sm font-semibold text-caution-fg mb-3 flex items-center gap-1">
            <TrendingDown size={16} /> 개선할 점
          </h3>
          <ul className="space-y-2 text-sm text-text">
            {improvements.length === 0 && <li className="text-text-subtle text-xs">(없음)</li>}
            {improvements.map((s, i) => (
              <li key={i} className="flex gap-2">
                <TrendingDown size={14} className="text-caution mt-0.5 shrink-0" />{s}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <MarkdownCopyBlock markdown={markdown} />
    </div>
  );
}

function MarkdownCopyBlock({ markdown }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="bg-surface border border-edge rounded-xl p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-brand">Markdown 요약</h3>
          <p className="text-xs text-text-muted mt-1">강점, 개선할 점, 총평만 포함됩니다.</p>
        </div>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-xs font-semibold text-brand-fg hover:bg-brand-hover"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? '복사됨' : 'MD 복사'}
        </button>
      </div>
      <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-xl border border-edge bg-surface-sunken p-4 text-sm leading-relaxed text-text">
        {markdown}
      </pre>
    </section>
  );
}

function ScoreGauge({ percent, score, max }) {
  const radius = 40;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (percent / 100) * circ;
  // 점수대별 색상은 시맨틱 토큰 var()로
  const color = percent >= 80 ? 'rgb(var(--positive))'
              : percent >= 60 ? 'rgb(var(--info))'
              : percent >= 40 ? 'rgb(var(--caution))'
              :                  'rgb(var(--critical))';

  return (
    <div className="relative w-24 h-24 shrink-0">
      <svg className="w-full h-full -rotate-90">
        <circle cx="48" cy="48" r={radius} stroke="rgb(var(--surface-sunken))" strokeWidth="8" fill="none" />
        <circle cx="48" cy="48" r={radius} stroke={color} strokeWidth="8" fill="none"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-text">{score}</span>
        <span className="text-[10px] text-text-subtle">/ {max}</span>
      </div>
    </div>
  );
}

function CriterionBlock({ criterion }) {
  const { criterionName, weight, score, levelLabel, comment, evidence = [], suggestions = [] } = criterion;
  const maxForCrit = weight || 0;
  const pct = maxForCrit > 0 ? Math.min(100, (score / maxForCrit) * 100) : 0;
  const barColor = pct >= 80 ? 'bg-positive'
                 : pct >= 60 ? 'bg-info'
                 : pct >= 40 ? 'bg-caution'
                 :              'bg-critical';

  return (
    <div className="p-3 bg-surface/50 border border-edge rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-text text-sm">{criterionName}</span>
          <span className="text-[10px] px-1.5 py-0.5 bg-surface-sunken rounded text-text-muted">가중치 {weight}</span>
          <span className="text-[10px] px-1.5 py-0.5 bg-info-muted/50 rounded text-info-fg">{levelLabel}</span>
        </div>
        <span className="font-bold text-text text-sm">
          {score} <span className="text-xs text-text-subtle">/ {maxForCrit}</span>
        </span>
      </div>
      <div className="h-1.5 bg-surface-sunken rounded-full overflow-hidden mb-2">
        <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
      </div>

      <p className="text-xs text-text leading-relaxed mb-2">{comment}</p>

      {evidence.length > 0 && (
        <div className="mt-2 space-y-1">
          {evidence.map((e, i) => (
            <div key={i} className="flex gap-1.5 items-start text-[11px] text-text-muted border-l-2 border-edge-strong pl-2">
              <Quote size={10} className="mt-0.5 shrink-0 text-text-subtle" />
              <span className="italic">{e}</span>
            </div>
          ))}
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="mt-2 flex flex-col gap-1">
          {suggestions.map((s, i) => (
            <div key={i} className="flex gap-1.5 items-start text-[11px] text-caution-fg/90">
              <Lightbulb size={11} className="mt-0.5 shrink-0" />
              <span>{s}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
