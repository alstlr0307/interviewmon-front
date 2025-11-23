/**
 * types.ts
 * - 전역 타입 정의 (모듈 강제: isolatedModules 대응)
 */
export type Company = { id: string; name: string };

export type Question = {
  id: string;
  text: string;
  timeLimit: number; // seconds
};

export type EvalLevel = "A" | "B" | "C" | "D";

export type EvalItem = {
  topic: string;                 // 감지된 토픽(동기/프로젝트/최적화 등)
  score: number;                 // 0~100
  level: EvalLevel;              // 등급
  keywordsHit: string[];         // 맞춘 키워드
  keywordsMiss: string[];        // 부족한 키워드
  feedback: string[];            // 개선 코멘트
  polished?: string;             // 문장 다듬기 버전
};

export type AnswerRecord = {
  questionId: string;
  content: string; // 사용자가 적은 답(STAR 모드면 합성 텍스트)
  status: "answered" | "timeout" | "skipped";
  secondsUsed: number;
  eval?: EvalItem; // AI 채점/피드백
};

export type QuestionItem = {
  id: string;
  companyId: string;
  text: string;
  timeLimit: number;
  tag?: string | null;   // "motivation" 등
  difficulty?: number;   // 1: 쉬움, 3: 어려움
  active: boolean;
};

export type Notice = {
  id: string;
  title: string;
  summary: string;
  content: string; // markdown-ish
  date: string; // ISO
  pinned?: boolean;
};

export type SessionOptions = {
  perQuestionSec: number;
  count: number;
  difficulty: "easy" | "normal" | "hard";
  starCoach?: boolean; // STAR 코치 모드 사용 여부
};

export type SessionRecord = {
  id: string;
  companyId: string;
  total: number;
  answered: number;
  timeouts: number;
  options: SessionOptions;
  records: AnswerRecord[];
  createdAt: string; // ISO
};

/** 스토리(답변 조각함/즐겨찾기) */
export type Story = {
  id: string;
  userId: string;
  companyId?: string;
  topic?: string;          // evaluator의 topic 키
  title: string;           // 카드 제목
  content: string;         // 본문(다듬기 결과 우선)
  tags: string[];          // ["STAR","리더십","수치지표"] 등
  createdAt: string;       // ISO
  updatedAt: string;       // ISO
};

// 빈 export로 모듈임을 명시 (isolatedModules 대비)
export {};
