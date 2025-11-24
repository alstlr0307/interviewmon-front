// src/hooks/useInterviewQuestions.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { saveAnswer, gradeAnswer } from "../api/interview";
import type { AiResult } from "../api/interview";

/** 서버/로컬에서 사용하는 질문 구조 */
export type QuestionItem = {
  id: number;
  text: string;
  answer?: string | null;
  score?: number | null;
  feedback?: string | null;      // DB 저장된 V5 전체 텍스트
  category?: string | null;
  durationMs?: number | null;
};

export type UseInterviewQuestionsOptions = {
  minChars?: number;
  debounceMs?: number;
  autosave?: boolean;
};

/* ---------- 내부 유틸 ---------- */
function hashString(s: string) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
}

const cache = new Map<string, AiResult>();

/* ============================================================
 * 메인 훅
 * ============================================================ */
export function useInterviewQuestions(
  sessionId: number | null,
  initial: QuestionItem[],
  opts: UseInterviewQuestionsOptions = {}
) {
  const minChars = opts.minChars ?? 40;
  const debounceMs = opts.debounceMs ?? 900;
  const autosave = opts.autosave ?? true;

  const [index, setIndex] = useState(0);
  const [list, setList] = useState<QuestionItem[]>(initial);
  const [draft, setDraft] = useState<string>("");
  const [ai, setAi] = useState<AiResult | null>(null);
  const [grading, setGrading] = useState(false);

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    cache.clear();
  }, [sessionId]);

  const timerRef = useRef<number | null>(null);
  const inflightTokenRef = useRef<string | null>(null);
  const qStartRef = useRef<number>(performance.now());

  const current = useMemo(() => list[index] || null, [list, index]);

  useEffect(() => {
    setList(initial);
    setIndex((i) =>
      Math.min(Math.max(0, i), Math.max(0, initial.length - 1))
    );
  }, [initial]);

  /* ============================================================
   * 질문 전환 시: draft/AI 초기화 + 기존 DB feedback 복원
   * ============================================================ */
  useEffect(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    inflightTokenRef.current = null;
    qStartRef.current = performance.now();

    if (!current) {
      setDraft("");
      setAi(null);
      setGrading(false);
      return;
    }

    setDraft(current.answer ?? "");

    if (current.score != null || current.feedback) {
      const sc = current.score ?? 0;

      setAi({
        score: sc,
        grade:
          sc >= 90
            ? "S"
            : sc >= 80
            ? "A"
            : sc >= 70
            ? "B"
            : sc >= 60
            ? "C"
            : sc >= 50
            ? "D"
            : "F",

        // DB에는 feedbackText 전체가 들어가 있으므로 summary로 대체해 표시
        summary: current.feedback ?? "",

        // 강화형 필드는 새 grade 호출 시 채워짐
        summary_interviewer: null,
        summary_coach: null,
        strengths: null,
        gaps: null,
        adds: null,
        pitfalls: null,
        next: null,
        polished: null,
        keywords: null,
        category: current.category ?? null
      });
    } else {
      setAi(null);
    }
  }, [current]);

  /* ============================================================
   * GPT V5 채점 호출
   * ============================================================ */
  const runGrade = useCallback(async (answer: string) => {
      if (!sessionId || !current) return null;
      const trimmed = answer.trim();
      if (trimmed.length < minChars) return null;

      const key = `${sessionId}:${current.id}:${hashString(trimmed)}`;
      if (cache.has(key)) return cache.get(key)!;

      const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      inflightTokenRef.current = token;

      try {
        const res = await gradeAnswer(sessionId, current.id, trimmed);
        if (!isMounted.current || inflightTokenRef.current !== token) return null;

        // 🔥 프론트 구조에 맞게 ai만 리턴
        const ai: AiResult = res;

        cache.set(key, ai);
        return ai;
      } catch {
      return null;
    }
  }, [sessionId, current, minChars]);

  /* ============================================================
   * Answer 입력 핸들러 (디바운스)
   * ============================================================ */
  const setAnswer = useCallback(
    (text: string) => {
      setDraft(text);
      if (!sessionId || !current) return;

      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      timerRef.current = window.setTimeout(async () => {
        if (!isMounted.current) return;

        setGrading(true);
        const r = await runGrade(text);
        if (!isMounted.current) return;
        setGrading(false);

        if (r) {
          const ai: AiResult = r;
          setAi(ai);

          setList((prev) =>
            prev.map((q) =>
              q.id === current.id
                ? {
                    ...q,
                    answer: text,
                    score: ai.score
                  }
                : q
            )
          );

          if (autosave) {
            try {
              await saveAnswer(sessionId, current.id, {
                answer: text,
                score: ai.score
              });
            } catch {}
          }
        }
      }, debounceMs) as unknown as number;
    },
    [sessionId, current, debounceMs, runGrade, autosave]
  );

  /* ============================================================
   * commit(): 문항 저장 + duration 기록
   * ============================================================ */
  const commit = useCallback(async () => {
    if (!sessionId || !current) return;

    const spent = Math.max(0, Math.round(performance.now() - qStartRef.current));

    const payload: {
      answer: string;
      score?: number | null;
      durationMs?: number | null;
    } = {
      answer: draft,
      durationMs: spent
    };
    if (ai) payload.score = ai.score;

    try {
      await saveAnswer(sessionId, current.id, payload);
      setList((prev) =>
        prev.map((q) =>
          q.id === current.id
            ? { ...q, durationMs: spent, answer: draft, score: ai?.score ?? q.score }
            : q
        )
      );
    } catch {}
  }, [sessionId, current, draft, ai]);

  const commitAndNext = useCallback(async () => {
    await commit();
    setIndex((i) => Math.min(list.length - 1, i + 1));
  }, [commit, list.length]);

  const next = useCallback(() => {
    setIndex((i) => Math.min(list.length - 1, i + 1));
  }, [list.length]);

  const prev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      inflightTokenRef.current = null;
    };
  }, []);

  return {
    index,
    setIndex,
    current,
    list,
    draft,
    setAnswer,
    ai,
    grading,
    commit,
    commitAndNext,
    next,
    prev
  };
}
