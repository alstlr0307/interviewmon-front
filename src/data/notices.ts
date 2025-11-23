// src/data/notices.ts
export type Notice = { id: string; title: string; summary: string; date: string };
export const NOTICES: Notice[] = [
  { id: "welcome", title: "면접몬 오픈 베타", summary: "6개 기업 랜덤 문항 · AI 채점(베타) 지원", date: new Date().toISOString() },
  { id: "tips",    title: "STAR 구조로 답변하기", summary: "상황-과제-행동-결과 순서로 핵심을 짧게", date: new Date(Date.now()-86400000).toISOString() },
];
