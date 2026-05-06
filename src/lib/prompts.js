/**
 * 프롬프트 번들 — Vite의 ?raw / ?json 임포트로 빌드 시 정적 포함.
 * 백엔드의 lib/prompt-loader.js를 대체합니다 (파일시스템 캐시 불필요).
 */
import assignmentSystem from '../../prompts/assignment-generate.system.md?raw';
import assignmentUser from '../../prompts/assignment-generate.user.md?raw';
import assignmentSchema from '../../prompts/assignment-generate.schema.json';

import rubricSystem from '../../prompts/rubric-generate.system.md?raw';
import rubricUser from '../../prompts/rubric-generate.user.md?raw';
import rubricSchema from '../../prompts/rubric-generate.schema.json';

import gradingSystem from '../../prompts/grading.system.md?raw';
import gradingUser from '../../prompts/grading.user.md?raw';
import gradingSchema from '../../prompts/grading.schema.json';

const SETS = {
  'assignment-generate': { system: assignmentSystem, userTemplate: assignmentUser, schema: assignmentSchema },
  'rubric-generate':     { system: rubricSystem,     userTemplate: rubricUser,     schema: rubricSchema },
  'grading':             { system: gradingSystem,    userTemplate: gradingUser,    schema: gradingSchema },
};

export function loadPromptSet(name) {
  const set = SETS[name];
  if (!set) throw new Error(`알 수 없는 프롬프트 세트: ${name}`);
  return set;
}

/**
 * `{{KEY}}` 플레이스홀더를 vars 객체로 치환.
 * vars[KEY]가 undefined여도 빈 문자열로 대체되지 않고 원본을 남깁니다 — 누락 인지 용이.
 */
export function renderTemplate(str, vars) {
  return str.replace(/\{\{(\w+)\}\}/g, (m, key) => (key in vars ? String(vars[key]) : m));
}
