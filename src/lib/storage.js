/**
 * 브라우저 영속 저장소 — IndexedDB(idb-keyval) 기반.
 * Phase 1의 SQLite 4 테이블(assignments/rubrics/submissions/gradings)을 4개의
 * key-value 스토어로 대체합니다. id → object 매핑이며 외래키는 단순 참조 ID로 보존.
 */
import { createStore, get, set, del, values } from 'idb-keyval';
import { v4 as uuidv4 } from 'uuid';
import { buildGradingMarkdown } from './gradingMarkdown.js';

// idb-keyval의 createStore는 DB 하나에 스토어 하나를 생성합니다.
// 같은 DB 이름을 공유하면 "object store not found" 오류가 발생하므로
// 각 스토어마다 독립된 DB 이름을 사용합니다.
const dbs = {
  assignments: createStore('ab-assignments', 'assignments'),
  rubrics:     createStore('ab-rubrics',     'rubrics'),
  submissions: createStore('ab-submissions', 'submissions'),
  gradings:    createStore('ab-gradings',    'gradings'),
};

const stores = dbs;

function nowIso() { return new Date().toISOString(); }

function makeStore(storeName) {
  const store = stores[storeName];
  return {
    async list() {
      const items = await values(store);
      return items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    },
    async get(id) {
      return (await get(id, store)) || null;
    },
    async create(data) {
      const id = data.id || uuidv4();
      const item = {
        ...data,
        id,
        createdAt: data.createdAt || nowIso(),
        updatedAt: nowIso(),
      };
      await set(id, item, store);
      return item;
    },
    async update(id, patch) {
      const existing = await get(id, store);
      if (!existing) return null;
      const merged = { ...existing, ...patch, id, updatedAt: nowIso() };
      await set(id, merged, store);
      return merged;
    },
    async delete(id) {
      await del(id, store);
      return true;
    },
    async filter(predicate) {
      const items = await values(store);
      return items.filter(predicate)
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    },
  };
}

export const assignmentsStore = makeStore('assignments');
export const rubricsStore     = makeStore('rubrics');
export const submissionsStore = makeStore('submissions');
export const gradingsStore    = makeStore('gradings');

/* ---------- 페이지 친화 헬퍼 ---------- */

/** rubricsApi.list(assignmentId) 호환: assignmentId 일치 + 무조건 비어있는(공용) 루브릭 */
export async function listRubricsForAssignment(assignmentId) {
  if (!assignmentId) return rubricsStore.list();
  return rubricsStore.filter((r) => r.assignmentId === assignmentId || !r.assignmentId);
}

/** gradingsApi.list 호환: submissionId/rubricId/assignmentId 필터 */
export async function listGradings(filter = {}) {
  const items = await gradingsStore.list();
  return items.filter((g) => {
    if (filter.submissionId && g.submissionId !== filter.submissionId) return false;
    if (filter.rubricId && g.rubricId !== filter.rubricId) return false;
    if (filter.assignmentId && g.assignmentId !== filter.assignmentId) return false;
    return true;
  });
}

/** 채점 시 submission + grading을 함께 영속화 */
export async function persistGrading({ assignment, rubric, submission, grading, provider, modelId }) {
  const sub = await submissionsStore.create({
    assignmentId: assignment?.id || null,
    studentName: submission.studentName || null,
    studentId: submission.studentId || null,
    content: submission.content,
    originalFilename: submission.originalFilename || null,
    mimeType: submission.mimeType || null,
  });
  const markdown = buildGradingMarkdown(grading);
  const saved = await gradingsStore.create({
    submissionId: sub.id,
    rubricId: rubric?.id || null,
    assignmentId: assignment?.id || null,
    title: assignment?.title || '채점 결과',
    markdown,
    provider,
    modelId,
    submission: sub, // 편의: 보관함에서 학생 이름 표시용
  });
  return { grading: { ...grading, markdown }, savedGrading: saved, submission: sub };
}
