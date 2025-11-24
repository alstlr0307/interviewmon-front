// src/hooks/useInterviewSession.ts
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  startSession,
  getSessionQuestions,
  finishSession,
  getSessionSummary,
} from "../api/interview";

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

export type SessionSummary = {
  total: number;
  answered: number;
  durationMs: number;
  score?: number | null;
  avgScore?: number | null;
  byCategory?: Array<{ category: string | null; count: number; avgScore: number | null }>;
};

export type StartOptions = { count?: number; jobTitle?: string | null };

export function useInterviewSession() {
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [company, setCompany] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<QuestionItem[]>([]);
  const [summary, setSummary] = useState<SessionSummary | null>(null);

  const started = useMemo(() => !!sessionId, [sessionId]);

  /* 시작 */
  const start = useCallback(async (c: string, opts: StartOptions = {}) => {
    setLoading(true);
    try {
      const { sessionId: sid, items: its } = await startSession(c, {
        count: opts.count ?? 10,
        jobTitle: opts.jobTitle ?? null,
      });
      setSessionId(sid);
      setCompany(c);
      setItems(its);
      return sid;
    } finally {
      setLoading(false);
    }
  }, []);

  /* 기존 세션 이어받기 */
  const adopt = useCallback(async (sid: number) => {
    setLoading(true);
    try {
      setSessionId(sid);
      const its = await getSessionQuestions(sid);
      setItems(its);
      return sid;
    } finally {
      setLoading(false);
    }
  }, []);

  /* 문항 새로고침 */
  const reloadQuestions = useCallback(async () => {
    if (!sessionId) return;
    const its = await getSessionQuestions(sessionId);
    setItems(its);
  }, [sessionId]);

  /* 세션 종료 */
  const finish = useCallback(async () => {
    if (!sessionId) return null;
    const s = await finishSession(sessionId);
    setSummary(s);
    return s;
  }, [sessionId]);

  /* 요약 로드 */
  const loadSummary = useCallback(async () => {
    if (!sessionId) return null;
    const s = await getSessionSummary(sessionId);
    setSummary(s);
    return s;
  }, [sessionId]);

  useEffect(() => {
    setSummary(null);
  }, [sessionId]);

  return {
    started,
    loading,
    sessionId,
    company,
    items,
    summary,

    start,
    adopt,
    reloadQuestions,
    finish,
    loadSummary,

    __setSessionId: setSessionId,
  };
}
