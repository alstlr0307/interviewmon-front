// src/api/interview.ts
// 백엔드(index.js)와 1:1 매칭되는 인터뷰 API 클라이언트 (baseURL은 http.ts에서 /api)
import http from "./http";

/** 세션에 붙은 문항 */
export type QuestionItem = {
  id: number;              // session_questions.id
  questionId: number | null;
  text: string;
  category: string | null;
  orderNo: number;
  answer?: string | null;
  score?: number | null;
  feedback?: string | null;
  durationMs?: number | null;
};

/** 세션 시작 옵션 */
export type StartOptions = {
  count?: number;
  jobTitle?: string | null;
};

/** AI 채점 결과(후방 호환 포함) */
export type AiResult = {
  score: number;
  grade: "S" | "A" | "B" | "C" | "D" | "F";
  summary: string;
  tips?: string[];
  keywords?: string[] | { hit: string[]; miss: string[] };
  polished?: string;
  category?: string | null;

  // 강화형 필드(있으면 사용)
  strengths?: string[];
  gaps?: string[];
  adds?: string[];
  pitfalls?: string[];
  next?: string;
};

const gradeFromScore = (s: number): AiResult["grade"] =>
  s >= 90 ? "S" : s >= 80 ? "A" : s >= 70 ? "B" : s >= 60 ? "C" : s >= 50 ? "D" : "F";

/* =========================
 * 세션 시작 (회사별 랜덤 문항 attach)
 * POST /companies/:company/sessions/start
 * ========================= */
export async function startSession(
  company: string,
  opts: StartOptions = {}
): Promise<{ sessionId: number; items: QuestionItem[] }> {
  const body = { count: opts.count ?? 10, jobTitle: opts.jobTitle ?? null };
  const { data } = await http.post(`/companies/${encodeURIComponent(company)}/sessions/start`, body);

  const sessionId: number = Number(data?.sessionId);
  const items = (data?.items || []).map((r: any) => ({
    id: Number(r.id),
    questionId: r.questionId != null ? Number(r.questionId) : null,
    text: String(r.text),
    category: r.category == null ? null : String(r.category),
    orderNo: Number(r.orderNo),
    answer: r.answer ?? null,
    score: r.score ?? null,
    feedback: r.feedback ?? null,
    durationMs: r.durationMs ?? null,
  })) as QuestionItem[];

  return { sessionId, items };
}

/* =========================
 * 세션 문항 조회
 * GET /sessions/:id/questions
 * ========================= */
export async function getSessionQuestions(sessionId: number): Promise<QuestionItem[]> {
  const { data } = await http.get(`/sessions/${sessionId}/questions`, { params: { _ts: Date.now() } });
  const items = (data?.items || []).map((r: any) => ({
    id: Number(r.id),
    questionId: r.questionId != null ? Number(r.questionId) : null,
    text: String(r.text),
    category: r.category == null ? null : String(r.category),
    orderNo: Number(r.orderNo),
    answer: r.answer ?? null,
    score: r.score ?? null,
    feedback: r.feedback ?? null,
    durationMs: r.durationMs ?? null,
  })) as QuestionItem[];
  return items;
}

/* =========================
 * 답변/채점/피드백/소요시간 저장 (부분 업데이트)
 * PATCH /sessions/:id/questions/:sqid
 * ========================= */
export async function saveAnswer(
  sessionId: number,
  sqid: number,
  payload: { answer?: string | null; score?: number | null; feedback?: string | null; durationMs?: number | null }
): Promise<void> {
  await http.patch(`/sessions/${sessionId}/questions/${sqid}`, payload);
}

/* =========================
 * AI 채점 실행 (강화본)
 * POST /sessions/:id/questions/:sqid/grade
 * ========================= */
export async function gradeAnswerAPI(
  sessionId: number,
  sqid: number,
  answer: string
): Promise<AiResult> {
  const { data } = await http.post(`/sessions/${sessionId}/questions/${sqid}/grade`, { answer });
  const ai = data?.ai || {};

  const score = Number(ai.score ?? 0);
  const result: AiResult = {
    score,
    grade: gradeFromScore(score),
    summary: String(ai.summary ?? ""),
    tips: Array.isArray(ai.tips) ? ai.tips : undefined,
    keywords: ai.keywords,
    polished: ai.polished,
    category: ai.category ?? null,
    strengths: ai.strengths,
    gaps: ai.gaps,
    adds: ai.adds,
    pitfalls: ai.pitfalls,
    next: ai.next,
  };
  return result;
}

// ✅ 기존 훅들과의 호환을 위해 같은 이름도 함께 export
export const gradeAnswer = gradeAnswerAPI;

/* =========================
 * 세션 종료(요약)
 * POST /sessions/:id/finish
 * -> { ok:true, summary:{ total, answered, score, durationMs } }
 * ========================= */
export async function finishSession(sessionId: number): Promise<{
  total: number;
  answered: number;
  score: number | null;
  durationMs: number;
}> {
  const { data } = await http.post(`/sessions/${sessionId}/finish`, {});
  const s = data?.summary || {};
  return {
    total: Number(s.total ?? 0),
    answered: Number(s.answered ?? 0),
    score: s.score != null ? Number(s.score) : null,
    durationMs: Number(s.durationMs ?? 0),
  };
}

/* =========================
 * 세션 요약(토픽별 평균 포함)
 * GET /sessions/:id/summary
 * ========================= */
export async function getSessionSummary(sessionId: number): Promise<{
  total: number;
  answered: number;
  avgScore: number | null;
  durationMs: number;
  byCategory: Array<{ category: string | null; count: number; avgScore: number | null }>;
}> {
  const { data } = await http.get(`/sessions/${sessionId}/summary`, { params: { _ts: Date.now() } });
  const s = data?.summary || {};
  const by = Array.isArray(s.byCategory) ? s.byCategory : [];
  return {
    total: Number(s.total ?? 0),
    answered: Number(s.answered ?? 0),
    avgScore: s.avgScore != null ? Number(s.avgScore) : null,
    durationMs: Number(s.durationMs ?? 0),
    byCategory: by.map((r: any) => ({
      category: r.category ?? null,
      count: Number(r.count ?? r.cnt ?? 0),
      avgScore: r.avgScore != null ? Number(r.avgScore) : null,
    })),
  };
}

/* =========================
 * (JD 등에서 뽑은) 커스텀 문항을 세션에 부착
 * POST /sessions/:id/questions/attach
 * body: { items: [{text, category?, questionId?}], replace?: boolean }
 * ========================= */
export async function attachQuestions(
  sessionId: number,
  items: Array<{ text: string; category?: string | null; questionId?: number | null }>,
  options?: { replace?: boolean }
): Promise<void> {
  await http.post(`/sessions/${sessionId}/questions/attach`, {
    items,
    replace: !!options?.replace,
  });
}
