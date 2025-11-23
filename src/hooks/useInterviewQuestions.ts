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
  feedback?: string | null;
  durationMs?: number | null;
};

export type UseInterviewQuestionsOptions = {
  /** 자동 채점에 필요한 최소 글자수 (기본 40) */
  minChars?: number;
  /** 입력 디바운스(ms) (기본 900) */
  debounceMs?: number;
  /** 채점 이후 자동 저장할지 여부 (기본 true) */
  autosave?: boolean;
};

/* ---------- 내부 유틸 ---------- */
function hashString(s: string) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
}

/** 동일 답변에 대한 중복 채점 방지용 캐시 */
const cache = new Map<string, AiResult>();

/* ---------- 메인 훅 ---------- */
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

  /** 언마운트/전환 안전장치 */
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  /** 세션 변경 시 캐시 초기화 (다른 세션 채점 섞임 방지) */
  useEffect(() => {
    cache.clear();
  }, [sessionId]);

  /** 질문 전환 시 타이머/입장시각/레이스 토큰 관리 */
  const timerRef = useRef<number | null>(null);
  const inflightTokenRef = useRef<string | null>(null);
  const qStartRef = useRef<number>(performance.now());

  /** 현재 질문 */
  const current = useMemo(() => list[index] || null, [list, index]);

  /** external initial 동기화 */
  useEffect(() => {
    setList(initial);
    setIndex((i) => Math.min(Math.max(0, i), Math.max(0, initial.length - 1)));
  }, [initial]);

  /** 현재 질문 바뀌면 드래프트/AI뷰 동기화 & 타이머 정리 & 입장 시각 갱신 */
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

    // 이미 채점된 이력(점수/피드백)이 있으면 최소 요약 메타만 구성 (실시간 패널은 새 grade가 오버라이드)
    if (current.score != null || current.feedback) {
      const sc = current.score ?? 0;
      const grade: AiResult["grade"] =
        sc >= 90 ? "S" : sc >= 80 ? "A" : sc >= 70 ? "B" : sc >= 60 ? "C" : sc >= 50 ? "D" : "F";
      setAi({
        score: sc,
        grade,
        summary: current.feedback ?? "",
      } as AiResult);
    } else {
      setAi(null);
    }
  }, [current]);

  /** 내부: 채점 실행 */
  const runGrade = useCallback(
    async (answer: string) => {
      if (!sessionId || !current) return null;
      const trimmed = (answer || "").trim();
      if (trimmed.length < minChars) return null;

      const key = `${sessionId}:${current.id}:${hashString(trimmed)}`;
      if (cache.has(key)) return cache.get(key)!;

      // 이 요청이 최신인지 판별할 토큰
      const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      inflightTokenRef.current = token;

      try {
        const res = await gradeAnswer(sessionId, current.id, trimmed);
        if (!isMounted.current || inflightTokenRef.current !== token) return null;
        cache.set(key, res);
        return res;
      } catch {
        return null;
      }
    },
    [sessionId, current, minChars]
  );

  /** 입력 핸들러(디바운스 채점) */
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

        if (r) {
          setAi(r);

          // 로컬 리스트의 현재 질문에 점수만 미리 반영 (★ feedback은 서버 '완본'을 덮지 않도록 로컬에도 넣지 않음)
          setList((prev) =>
            prev.map((q) =>
              q.id === current.id
                ? { ...q, answer: text, score: r.score }
                : q
            )
          );

          // 자동 저장(가능하면 서버에도 반영) - ★ feedback은 전송하지 않음
          if (autosave) {
            try {
              await saveAnswer(sessionId, current.id, {
                answer: text,
                score: r.score,
              });
            } catch {
              /* 네트워크 오류는 조용히 무시(다음 commit에서 다시 저장) */
            }
          }
        }
        setGrading(false);
      }, debounceMs) as unknown as number;
    },
    [sessionId, current, debounceMs, runGrade, autosave]
  );

  /** 현재 질문 커밋(답변 + 최신 AI 결과 + durationMs 저장) */
  const commit = useCallback(async () => {
    if (!sessionId || !current) return;

    const spent = Math.max(0, Math.round(performance.now() - qStartRef.current));

    const payload: {
      answer: string;
      score?: number | null;
      durationMs?: number | null;
    } = {
      answer: draft,
      durationMs: spent,
    };
    if (ai) payload.score = ai.score;

    try {
      await saveAnswer(sessionId, current.id, payload);
      // 로컬 상태에도 duration 반영
      setList((prev) =>
        prev.map((q) =>
          q.id === current.id
            ? { ...q, durationMs: spent, answer: draft, score: ai?.score ?? q.score }
            : q
        )
      );
    } catch {
      /* 저장 실패는 상위에서 리트라이 버튼 등으로 처리 가능 */
    }
  }, [sessionId, current, draft, ai]);

  /** 커밋 후 다음 질문으로 이동(UX 편의) */
  const commitAndNext = useCallback(async () => {
    await commit();
    setIndex((i) => Math.min(list.length - 1, i + 1));
  }, [commit, list.length]);

  /** 네비게이션 */
  const next = useCallback(() => {
    setIndex((i) => Math.min(list.length - 1, i + 1));
  }, [list.length]);

  const prev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  /** 언마운트 시 타이머 클리어 */
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
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
    prev,
  };
}
