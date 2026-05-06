export function buildGradingMarkdown(grading = {}) {
  const strengths = Array.isArray(grading.strengths) ? grading.strengths : [];
  const improvements = Array.isArray(grading.improvements) ? grading.improvements : [];
  const overallComment = grading.overallComment || '';

  return [
    '## 강점',
    formatList(strengths),
    '',
    '## 개선할 점',
    formatList(improvements),
    '',
    '## 총평',
    overallComment.trim() || '(없음)',
  ].join('\n').trim();
}

function formatList(items) {
  if (!items.length) return '- (없음)';
  return items.map((item) => `- ${String(item).trim()}`).join('\n');
}
