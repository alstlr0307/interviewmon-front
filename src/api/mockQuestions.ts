// src/api/mockQuestions.ts
// 로컬 질문 뱅크 CRUD + 서버 연동 메서드 재-export (겸용 모듈)

import type { QuestionItem } from "../types";

// (필요 시) 서버 연동 메서드는 이 파일에서 re-export
// export { suggestQuestions, attachQuestions, getSessionQuestions } from "./questions";

// ────────────────────────────────────────────────────────────────
// LocalStorage 키
// ────────────────────────────────────────────────────────────────
const LS_KEY = "im-questions";
const LS_VER = "im-questions-version";

// 타입 가드
function isQuestionArray(v: unknown): v is QuestionItem[] {
  return Array.isArray(v);
}

// 로컬 질문 목록 로드(없으면 빈 배열)
export function loadQuestions(): QuestionItem[] {
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return isQuestionArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// 로컬 질문 목록 저장
export function saveQuestions(list: QuestionItem[]): void {
  localStorage.setItem(LS_KEY, JSON.stringify(list));
  if (!localStorage.getItem(LS_VER)) localStorage.setItem(LS_VER, "1");
}

// 브라우저 호환 ID 생성기
function genId(): string {
  return "q_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// 추가/수정(upsert)
export function upsertQuestion(q: QuestionItem): void {
  const list = loadQuestions();

  // 정규화: UI가 어떤 필드를 읽어도 보이도록 text/title/content 동기화
  const text = (q as any).text ?? (q as any).title ?? (q as any).content ?? "";
  const item: any = {
    ...(q as any),
    text,
    title: text,
    content: text,
  };
  if (!item.id) item.id = genId();

  const idx = list.findIndex((x: any) => x.id === item.id);
  if (idx >= 0) list[idx] = item as QuestionItem;
  else list.unshift(item as QuestionItem);

  saveQuestions(list);
}

// 삭제
export function removeQuestion(id: string): void {
  const list = loadQuestions().filter((x: any) => x.id !== id);
  saveQuestions(list);
}
