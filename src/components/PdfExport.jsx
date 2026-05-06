import React from 'react';
import { Download } from 'lucide-react';
import Button from './common/Button.jsx';

/**
 * 채점 리포트 PDF 내보내기.
 * 브라우저 인쇄 API 기반(의존성 없이) — 새 창에 HTML 작성 후 window.print().
 */
export default function PdfExport({ grading, rubric, submission, assignment, disabled }) {
  function handleExport() {
    if (!grading) return;
    const html = buildHtml({ grading, rubric, submission, assignment });
    const w = window.open('', '_blank', 'width=900,height=800');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 300);
  }

  return (
    <Button onClick={handleExport} icon={Download} variant="secondary" size="sm" disabled={disabled || !grading}>
      PDF 내보내기
    </Button>
  );
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildHtml({ grading, rubric, submission, assignment }) {
  const percent = grading.maxScore > 0 ? Math.round((grading.totalScore / grading.maxScore) * 100) : 0;
  const date = new Date().toLocaleString('ko-KR');

  const criterionRows = (grading.criterionScores || []).map((cs) => `
    <div class="criterion">
      <div class="criterion-head">
        <strong>${escapeHtml(cs.criterionName || cs.criterionId)}</strong>
        <span class="weight">가중치 ${cs.weight || 0}</span>
        <span class="level">${escapeHtml(cs.levelLabel || '')}</span>
        <span class="score">${cs.score} / ${cs.weight || 0}</span>
      </div>
      <p class="comment">${escapeHtml(cs.comment || '')}</p>
      ${(cs.evidence || []).map((e) => `<div class="evidence">"${escapeHtml(e)}"</div>`).join('')}
      ${(cs.suggestions || []).map((s) => `<div class="suggestion">→ ${escapeHtml(s)}</div>`).join('')}
    </div>
  `).join('');

  const strengthsHtml = (grading.strengths || []).map((s) => `<li>${escapeHtml(s)}</li>`).join('');
  const improvementsHtml = (grading.improvements || []).map((s) => `<li>${escapeHtml(s)}</li>`).join('');

  // 리포트 HTML은 인쇄 환경(라이트)에서 직접 색을 갖도록 함 — tokens.css와 무관.
  return `<!DOCTYPE html><html lang="ko"><head>
<meta charset="UTF-8"><title>채점 리포트 - ${escapeHtml(assignment?.title || '')}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Pretendard', system-ui, -apple-system, sans-serif; margin: 40px; color: #1e293b; line-height: 1.6; }
  h1 { font-size: 22px; margin: 0 0 4px; color: #0f172a; }
  .meta { color: #64748b; font-size: 12px; margin-bottom: 24px; }
  .score-box { display: flex; align-items: center; gap: 24px; padding: 20px; background: #f1f5f9; border-radius: 12px; margin-bottom: 24px; }
  .score-big { font-size: 42px; font-weight: 800; color: ${percent >= 80 ? '#10b981' : percent >= 60 ? '#3b82f6' : percent >= 40 ? '#f59e0b' : '#ef4444'}; }
  .score-max { font-size: 14px; color: #64748b; }
  .section { margin-bottom: 20px; }
  .section h2 { font-size: 14px; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin-bottom: 10px; }
  .criterion { padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 10px; }
  .criterion-head { display: flex; gap: 10px; align-items: center; margin-bottom: 6px; font-size: 13px; }
  .criterion-head .weight { background: #e2e8f0; color: #475569; padding: 1px 6px; border-radius: 3px; font-size: 10px; }
  .criterion-head .level { background: #dbeafe; color: #1e40af; padding: 1px 6px; border-radius: 3px; font-size: 10px; }
  .criterion-head .score { margin-left: auto; font-weight: 700; color: #0f172a; }
  .comment { font-size: 12px; margin: 4px 0; color: #334155; }
  .evidence { font-size: 11px; color: #64748b; font-style: italic; padding-left: 10px; border-left: 2px solid #cbd5e1; margin: 3px 0; }
  .suggestion { font-size: 11px; color: #b45309; margin: 3px 0; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .col { padding: 12px; background: #f8fafc; border-radius: 8px; }
  .col ul { padding-left: 16px; margin: 6px 0; font-size: 12px; }
  .overall { font-size: 12px; line-height: 1.7; white-space: pre-wrap; background: #f8fafc; padding: 12px; border-radius: 8px; }
  @media print { body { margin: 20mm; } }
</style></head><body>
  <h1>채점 리포트</h1>
  <div class="meta">
    <strong>${escapeHtml(assignment?.title || '')}</strong>
    ${submission?.studentName ? ` · 학생: ${escapeHtml(submission.studentName)}` : ''}
    ${rubric?.title ? ` · 루브릭: ${escapeHtml(rubric.title)}` : ''}
    <br>생성일: ${date}
  </div>

  <div class="score-box">
    <div>
      <div class="score-big">${grading.totalScore} <span class="score-max">/ ${grading.maxScore}</span></div>
      <div style="color:#64748b;font-size:13px;">${percent}%</div>
    </div>
  </div>

  <div class="section">
    <h2>기준별 점수</h2>
    ${criterionRows}
  </div>

  ${grading.overallComment ? `<div class="section"><h2>총평</h2><div class="overall">${escapeHtml(grading.overallComment)}</div></div>` : ''}

  <div class="two-col">
    <div class="col"><strong style="color:#059669;">강점</strong><ul>${strengthsHtml || '<li>(없음)</li>'}</ul></div>
    <div class="col"><strong style="color:#b45309;">개선할 점</strong><ul>${improvementsHtml || '<li>(없음)</li>'}</ul></div>
  </div>
</body></html>`;
}
