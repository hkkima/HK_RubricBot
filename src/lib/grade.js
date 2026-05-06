/**
 * 채점·생성 워크플로 — LLM 호출 + 후처리.
 * Phase 1의 routes/{assignments,rubrics,gradings}.js 비즈니스 로직을 흡수.
 */
import { callLLM } from './llm.js';
import { loadPromptSet, renderTemplate } from './prompts.js';

/* ---------- 과제 생성 ---------- */

export async function generateAssignment({ provider, apiKey, modelId, direction }) {
  if (!direction) throw new Error('direction이 필요합니다.');
  const { system, userTemplate, schema } = loadPromptSet('assignment-generate');
  const goals = Array.isArray(direction.goals) ? direction.goals.join(', ') : (direction.goals || '');
  const userPrompt = renderTemplate(userTemplate, {
    SUBJECT: direction.subject || '(미지정)',
    AUDIENCE: direction.audience || '(미지정)',
    DIFFICULTY: direction.difficulty || '보통',
    GOALS: goals || '(지정 없음)',
    REFERENCE_AND_CONSTRAINTS:
      [direction.referenceText, direction.constraints].filter(Boolean).join('\n\n') || '(없음)',
  });
  const { data } = await callLLM({
    provider, apiKey, modelId,
    systemPrompt: system,
    userPrompt,
    responseSchema: schema,
  });
  return {
    ...data,
    subject: data.subject || direction.subject || null,
    audience: data.audience || direction.audience || null,
    difficulty: data.difficulty || direction.difficulty || null,
    rawInput: direction,
    source: 'generated',
    provider,
    modelId,
  };
}

/* ---------- 루브릭 생성 ---------- */

export async function generateRubric({ provider, apiKey, modelId, assignment, options = {}, files = [] }) {
  if (!assignment) throw new Error('assignment가 필요합니다.');
  const { system, userTemplate, schema } = loadPromptSet('rubric-generate');
  const objectives = Array.isArray(assignment.objectives)
    ? assignment.objectives.map((o, i) => `${i + 1}. ${o}`).join('\n')
    : '';
  const hasExplicitCriteria = objectives.trim().length > 0;
  const userPrompt = renderTemplate(userTemplate, {
    ASSIGNMENT_TITLE: assignment.title,
    ASSIGNMENT_SUBJECT: assignment.subject || '(미지정)',
    ASSIGNMENT_AUDIENCE: assignment.audience || '(미지정)',
    ASSIGNMENT_DIFFICULTY: assignment.difficulty || '보통',
    ASSIGNMENT_OBJECTIVES: objectives || '(별도 평가 기준 없음 - 기본 2개 기준으로 생성)',
    ASSIGNMENT_INSTRUCTIONS: assignment.instructions || '',
    SCALE_TYPE: options.scaleType || '4-level',
    TOTAL_SCORE: options.totalScore || 100,
    CRITERIA_HINT: [
      options.criteriaHint || '(자동 도출)',
      hasExplicitCriteria
        ? '입력된 평가 기준을 우선 반영하되 최대 5개를 넘기지 마세요.'
        : '별도 평가 기준이 없으므로 기본 2개 기준으로 생성하세요. 꼭 필요한 경우에만 최대 5개까지 확장하세요.',
    ].join('\n'),
  });
  const { data } = await callLLM({
    provider, apiKey, modelId,
    systemPrompt: system,
    userPrompt,
    responseSchema: schema,
    files,
  });
  return {
    ...data,
    assignmentId: assignment.id || null,
    provider,
    modelId,
  };
}

/* ---------- 채점 ---------- */

export function rubricToMarkdownTable(rubric) {
  const criteria = rubric.criteria || [];
  let md = '| ID | 기준 | 가중치 | 설명 | 레벨 (점수) |\n|---|---|---|---|---|\n';
  for (const c of criteria) {
    const levels = (c.levels || [])
      .map((l) => `**${l.label}**(${l.score}): ${l.descriptor}`)
      .join(' / ');
    md += `| ${c.id} | ${c.name} | ${c.weight} | ${c.description} | ${levels} |\n`;
  }
  return md;
}

export async function runGrading({ provider, apiKey, modelId, assignment, rubric, submission, files = [] }) {
  if (!assignment || !rubric || !submission?.content) {
    throw new Error('assignment, rubric, submission.content 필수.');
  }
  const { system, userTemplate, schema } = loadPromptSet('grading');
  const objectives = Array.isArray(assignment.objectives)
    ? assignment.objectives.map((o, i) => `${i + 1}. ${o}`).join('\n')
    : '';
  const userPrompt = renderTemplate(userTemplate, {
    ASSIGNMENT_TITLE: assignment.title,
    ASSIGNMENT_OBJECTIVES: objectives || '(명시 없음)',
    ASSIGNMENT_INSTRUCTIONS: assignment.instructions || '',
    TOTAL_SCORE: rubric.totalScore || 100,
    SCALE_TYPE: rubric.scaleType || '4-level',
    RUBRIC_TABLE: rubricToMarkdownTable(rubric),
    STUDENT_NAME: submission.studentName || '(익명)',
    SUBMISSION_TEXT: submission.content,
  });
  const { data } = await callLLM({
    provider, apiKey, modelId,
    systemPrompt: system,
    userPrompt,
    responseSchema: schema,
    files,
  });
  // maxScore 기본값 보정
  data.maxScore = Number(rubric.totalScore || data.maxScore || 100);
  // weight/criterionName 보강 (rubric 정보로 채움)
  data.criterionScores = (data.criterionScores || []).map((cs) => {
    const match = (rubric.criteria || []).find((c) => c.id === cs.criterionId);
    const weight = Number(cs.weight ?? match?.weight ?? 0);
    const score = Math.max(0, Math.min(Number(cs.score) || 0, weight || Number.MAX_SAFE_INTEGER));
    return {
      ...cs,
      criterionName: cs.criterionName || match?.name || cs.criterionId,
      weight,
      score,
    };
  });
  // LLM이 총점을 평균/오류 점수로 반환하는 경우가 있어 기준별 점수 합으로 확정한다.
  data.totalScore = roundScore(data.criterionScores.reduce((sum, cs) => sum + (Number(cs.score) || 0), 0));
  return { ...data, provider, modelId };
}

function roundScore(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}
