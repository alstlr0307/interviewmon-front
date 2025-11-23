// src/hooks/useInterviewSession.ts
import { useCallback, useEffect, useMemo, useState } from "react";
import { startSession, getSessionQuestions, finishSession, getSessionSummary } from "../api/interview";

export type StartOptions = { count?: number; jobTitle?: string | null };

export type QuestionItem = {
  id: number;             // 세션 내 질문ID
  questionId: number | null; // 원본 질문ID(없을 수도)
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
  score?: number | null;     // finish
  avgScore?: number | null;  // summary
  byCategory?: Array<{ category: string | null; count: number; avgScore: number | null }>;
};

export function useInterviewSession() {
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [company, setCompany] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<QuestionItem[]>([]);
  const [summary, setSummary] = useState<SessionSummary | null>(null);

  const started = useMemo(() => !!sessionId, [sessionId]);

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
    } finally { setLoading(false); }
  }, []);

  const adopt = useCallback(async (sid: number) => {
    setLoading(true);
    try {
      setSessionId(sid);
      const its = await getSessionQuestions(sid);
      setItems(its);
      return sid;
    } finally { setLoading(false); }
  }, []);

  const reloadQuestions = useCallback(async () => {
    if (!sessionId) return;
    const its = await getSessionQuestions(sessionId);
    setItems(its);
  }, [sessionId]);

  const finish = useCallback(async () => {
    if (!sessionId) return null;
    const s = await finishSession(sessionId);
    setSummary({ ...s });
    return s;
  }, [sessionId]);

  const loadSummary = useCallback(async () => {
    if (!sessionId) return null;
    const s = await getSessionSummary(sessionId);
    setSummary({ ...s });
    return s;
  }, [sessionId]);

  useEffect(() => { setSummary(null); }, [sessionId]);

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
