// src/api/sessionAnswers.ts
// ⚠ 중요: V5에서는 answers 엔드포인트가 존재하지 않음.
// → 질문별 저장은 interview.ts의 saveAnswer() 사용
// → 세션 완료는 finishSession()
// → 세션 요약은 getSessionSummary() 사용

// 이 파일은 하위호환 목적이므로 최소한만 유지
import http from "./http";

/** (하위호환) 세션 모든 답변 조회 */
export async function listAnswers(sessionId: number) {
  const { data } = await http.get(`/sessions/${sessionId}/questions`);
  return data.items;
}

/** (하위호환) 세션 전체 평가 */
export async function evaluateSession(sessionId: number) {
  const { data } = await http.post(`/sessions/${sessionId}/finish`, {});
  return data.summary;
}

// saveAnswer는 존재하지 않는 old API라 제거
