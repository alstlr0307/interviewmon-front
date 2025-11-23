// src/data/questions.ts
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
