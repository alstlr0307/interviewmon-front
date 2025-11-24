// src/api/interview.ts
// 백엔드(index.js)와 1:1 매칭되는 인터뷰 API 클라이언트

import http from "./http";

/* -------------------------------------------
 * 서버 session_questions 구조
 * ------------------------------------------- */
export type QuestionItem = {
  id: number;
  questionId: number | null;
  text: string;
  category: string | null;
  orderNo: number;

  answer?: string | null;
  score?: number | null;
  feedback?: string | null;
  durationMs?: number | null;
};

/* -------------------------------------------
 * 세션 시작 옵션
 * ------------------------------------------- */
export type StartOptions = {
  count?: number;
  jobTitle?: string | null;
};

/* -------------------------------------------
 * AI 결과 (V5 고급형)
 * ------------------------------------------- */
export type AiResult = {
  score: number;
  grade: "S" | "A" | "B" | "C" | "D" | "F";

  // 한 줄 요약(면접관/코치 중 택1)
  summary?: string | null;

  // 상세 필드들
  summary_interviewer?: string | null;
  summary_coach?: string | null;
  strengths?: string[] | null;
  gaps?: string[] | null;
  adds?: string[] | null;
  pitfalls?: { text: string; level: number }[] | null;
  next?: string[] | null;
  tips?: string[] | null;
  keywords?: string[] | null;
  category?: string | null;
  polished?: string | null;
};

const gradeFromScore = (s: number): AiResult["grade"] =>
  s >= 90 ? "S" : s >= 80 ? "A" : s >= 70 ? "B" : s >= 60 ? "C" : s >= 50 ? "D" : "F";

/* ============================================================
 * 세션 시작
 * POST /api/companies/:company/sessions/start
 * ============================================================ */
export async function startSession(
  company: string,
  opts: StartOptions = {}
): Promise<{ sessionId: number; items: QuestionItem[] }> {
  const body = { count: opts.count ?? 10, jobTitle: opts.jobTitle ?? null };

  const { data } = await http.post(
    `/companies/${encodeURIComponent(company)}/sessions/start`,
    body
  );

  return {
    sessionId: Number(data.sessionId),
    items: (data.items || []).map((r: any) => ({
      id: Number(r.id),
      questionId: r.questionId != null ? Number(r.questionId) : null,
      text: String(r.text),
      category: r.category ?? null,
      orderNo: Number(r.orderNo),
      answer: r.answer ?? null,
      score: r.score ?? null,
      feedback: r.feedback ?? null,
      durationMs: r.durationMs ?? null,
    })),
  };
}

/* ============================================================
 * 세션 문항 조회
 * GET /api/sessions/:id/questions
 * ============================================================ */
export async function getSessionQuestions(
  sessionId: number
): Promise<QuestionItem[]> {
  const { data } = await http.get(`/sessions/${sessionId}/questions`, {
    params: { _ts: Date.now() },
  });

  return (data.items || []).map((r: any) => ({
    id: Number(r.id),
    questionId: r.questionId != null ? Number(r.questionId) : null,
    text: String(r.text),
    category: r.category ?? null,
    orderNo: Number(r.orderNo),
    answer: r.answer ?? null,
    score: r.score ?? null,
    feedback: r.feedback ?? null,
    durationMs: r.durationMs ?? null,
  }));
}

/* ============================================================
 * 부분 저장 (답변/점수/시간/피드백)
 * PATCH /api/sessions/:id/questions/:sqid
 * ============================================================ */
export async function saveAnswer(
  sessionId: number,
  sqid: number,
  payload: {
    answer?: string | null;
    score?: number | null;
    feedback?: string | null;
    durationMs?: number | null;
  }
) {
  await http.patch(`/sessions/${sessionId}/questions/${sqid}`, payload);
}

/* ============================================================
 * AI 채점 (V5 강화버전)
 * POST /api/sessions/:id/questions/:sqid/grade
 * ============================================================ */
export async function gradeAnswerAPI(
  sessionId: number,
  sqid: number,
  answer: string
): Promise<AiResult> {
  const { data } = await http.post(
    `/sessions/${sessionId}/questions/${sqid}/grade`,
    { answer }
  );

  const ai = data.ai || {};
  const score = Number(ai.score ?? 0);

  return {
    score,
    grade: ai.grade ?? gradeFromScore(score),

    // summary는 interviewer / coach 중 하나로 통일
    summary: ai.summary_interviewer ?? ai.summary_coach ?? null,

    summary_interviewer: ai.summary_interviewer ?? null,
    summary_coach: ai.summary_coach ?? null,
    strengths: ai.strengths ?? null,
    gaps: ai.gaps ?? null,
    adds: ai.adds ?? null,
    pitfalls: ai.pitfalls ?? null,
    next: ai.next ?? null,
    tips: ai.tips ?? null,
    keywords: ai.keywords ?? null,
    category: ai.category ?? null,
    polished: ai.polished ?? null,
  };
}

// 호환 유지 alias
export const gradeAnswer = gradeAnswerAPI;

/* ============================================================
 * 세션 종료
 * POST /api/sessions/:id/finish
 * ============================================================ */
export async function finishSession(sessionId: number) {
  const { data } = await http.post(`/sessions/${sessionId}/finish`, {});
  return data.summary;
}

/* ============================================================
 * 세션 요약
 * ============================================================ */
export async function getSessionSummary(sessionId: number) {
  const { data } = await http.get(`/sessions/${sessionId}/summary`, {
    params: { _ts: Date.now() },
  });
  return data.summary;
}

/* ============================================================
 * 커스텀 문항 부착
 * ============================================================ */
export async function attachQuestions(
  sessionId: number,
  items: Array<{ text: string; category?: string | null; questionId?: number | null }>,
  options?: { replace?: boolean }
) {
  await http.post(`/sessions/${sessionId}/questions/attach`, {
    items,
    replace: !!options?.replace,
  });
}
