// src/api/sessionAnswers.ts
import http from "./http";

export async function saveAnswer(sessionId: number, questionId: number, answerText: string) {
  await http.post(`/api/sessions/${sessionId}/answers`, { questionId, answerText });
}

export async function listAnswers(sessionId: number) {
  const { data } = await http.get(`/api/sessions/${sessionId}/answers`);
  return data.items as {
    orderNo: number; questionId: number; questionText: string;
    answerText?: string; evalScore?: number; aiAdvice?: any;
  }[];
}

export async function evaluateSession(sessionId: number) {
  const { data } = await http.post(`/api/sessions/${sessionId}/answers/evaluate`);
  return data as { score: number; count: number };
}
