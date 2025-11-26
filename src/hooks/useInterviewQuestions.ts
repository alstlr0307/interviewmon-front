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
  feedback?: string | null; // DB 저장된 V5 전체 텍스트
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

// 🔥 동일 세션/질문/답변 조합에 대해 AI 요청 1번만 보내도록 캐시
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

  // 세션 변경 시 캐시 초기화
  useEffect(() => {
    cache.clear();
  }, [sessionId]);

  const timerRef = useRef<number | null>(null);
  const qStartRef = useRef<number>(performance.now());

  const current = useMemo(() => list[index] || null, [list, index]);

  // initial 변경 시 현재 index 최대값 조정
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
    // 디바운스 타이머 클리어
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    qStartRef.current = performance.now();

    if (!current) {
      setDraft("");
      setAi(null);
      setGrading(false);
      return;
    }

    // 답변 텍스트 복원
    setDraft(current.answer ?? "");

    // 이미 점수/피드백이 저장된 문항이면 간단 버전으로 AI 상태 복원
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
        summary: current.feedback ?? "",
        summary_interviewer: null,
        summary_coach: null,
        strengths: null,
        gaps: null,
        adds: null,
        pitfalls: null,
        next: null,
        tips: null,
        keywords: null,
        category: current.category ?? null,
        polished: null,
      });
    } else {
      setAi(null);
    }
  }, [current]);

  /* ============================================================
   * GPT V5 채점 호출 (단일 호출 + 캐시)
   * ============================================================ */
  const runGrade = useCallback(
    async (answer: string, questionId: number): Promise<AiResult | null> => {
      if (!sessionId) return null;

      const trimmed = answer.trim();
      if (trimmed.length < minChars) return null;

      const key = `${sessionId}:${questionId}:${hashString(trimmed)}`;
      const cached = cache.get(key);
      if (cached) return cached;

      try {
        const res = await gradeAnswer(sessionId, questionId, trimmed);
        if (!isMounted.current) return null;

        cache.set(key, res);
        return res;
      } catch (e) {
        console.error("[grade] error", e);
        return null;
      }
    },
    [sessionId, minChars]
  );

  /* ============================================================
   * Answer 입력 핸들러 (디바운스)
   * ============================================================ */
  const setAnswer = useCallback(
    (text: string) => {
      setDraft(text);
      if (!sessionId || !current) return;

      // 이전 타이머 정리
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      const qid = current.id;

      timerRef.current = window.setTimeout(async () => {
        if (!isMounted.current) return;

        setGrading(true);
        const r = await runGrade(text, qid);
        if (!isMounted.current) return;
        setGrading(false);

        if (r) {
          setAi(r);

          setList((prev) =>
            prev.map((q) =>
              q.id === qid
                ? {
                    ...q,
                    answer: text,
                    score: r.score,
                  }
                : q
            )
          );

          if (autosave) {
            try {
              await saveAnswer(sessionId, qid, {
                answer: text,
                score: r.score,
              });
            } catch (e) {
              console.error("[saveAnswer] error", e);
            }
          }
        }
      }, debounceMs) as unknown as number;
    },
    [sessionId, current, debounceMs, runGrade, autosave]
  );

  /* ============================================================
   * commit(): 문항 저장 + duration 기록
   *  - 여기서도 마지막으로 채점이 안 되어 있으면 강제 채점
   * ============================================================ */
  const commit = useCallback(async () => {
    if (!sessionId || !current) return;

    // 디바운스 타이머 취소 (여기서 직접 채점/저장 처리)
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const spent = Math.max(
      0,
      Math.round(performance.now() - qStartRef.current)
    );

    let finalAi = ai;
    const trimmed = draft.trim();

    // 아직 채점이 안 됐고, 글자 수가 충분하면 여기서 즉시 채점
    if (!finalAi && trimmed.length >= minChars) {
      setGrading(true);
      const r = await runGrade(trimmed, current.id);
      setGrading(false);

      if (r && isMounted.current) {
        finalAi = r;
        setAi(r);
        setList((prev) =>
          prev.map((q) =>
            q.id === current.id
              ? {
                  ...q,
                  answer: trimmed,
                  score: r.score,
                }
              : q
          )
        );
      }
    }

    const payload: {
      answer: string;
      score?: number | null;
      durationMs?: number | null;
    } = {
      answer: draft,
      durationMs: spent,
    };

    if (finalAi) {
      payload.score = finalAi.score;
    }

    try {
      await saveAnswer(sessionId, current.id, payload);

      setList((prev) =>
        prev.map((q) =>
          q.id === current.id
            ? {
                ...q,
                durationMs: spent,
                answer: draft,
                score: finalAi?.score ?? q.score,
              }
            : q
        )
      );
    } catch (e) {
      console.error("[commit] saveAnswer error", e);
    }
  }, [sessionId, current, draft, ai, minChars, runGrade]);

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

  // 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
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
    prev,
  };
}
