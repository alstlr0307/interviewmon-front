// src/pages/Interview.tsx
/**
 * pages/Interview.tsx
 * - 문항 진행/타이머/입력(일반 또는 STAR) + 기록 저장/평가
 * - 서버 세션과 훅(useInterviewSession/useInterviewQuestions)을 사용
 */
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useInterviewSession } from "../hooks/useInterviewSession";
import { useInterviewQuestions } from "../hooks/useInterviewQuestions";

type StartState = {
  sessionId?: number;
  options?: { count: number; difficulty: "easy" | "normal" | "hard"; starCoach?: boolean; jobTitle?: string | null };
  topicFilters?: string[];
};

const DIFF_TO_TIME = { easy: 30, normal: 45, hard: 60 } as const;

export default function Interview() {
  const { company = "" } = useParams();
  const nav = useNavigate();
  const { state } = useLocation() as { state: StartState | null };

  const opt = useMemo(() => {
    const base = { count: 10, difficulty: "normal" as const, starCoach: true, jobTitle: null as string | null };
    try {
      const stored = JSON.parse(localStorage.getItem("im-last-options") || "{}");
      return { ...base, ...(stored || {}), ...(state?.options || {}) };
    } catch {
      return base;
    }
  }, [state]);

  const { started, sessionId, items, start, adopt, finish } = useInterviewSession();

  // 세션 시작 또는 승계
  useEffect(() => {
    (async () => {
      if (!started) {
        if (state?.sessionId) { await adopt(state.sessionId); return; }
        if (company) { await start(company as string, { count: opt.count, jobTitle: opt.jobTitle }); }
      }
    })();
  }, [started, company, start, adopt, opt.count, opt.jobTitle, state?.sessionId]);

  const q = useInterviewQuestions(sessionId, items, { minChars: 40, debounceMs: 900, autosave: true });

  // 난이도별 제한 시간
  const perLimit = DIFF_TO_TIME[(opt.difficulty ?? "normal") as keyof typeof DIFF_TO_TIME];

  const [left, setLeft] = useState<number>(perLimit);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setLeft(perLimit);
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => setLeft((s: number) => (s > 0 ? s - 1 : 0)), 1000) as unknown as number;
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, [q.current?.id, perLimit]);

  useEffect(() => { if (left === 0) onNext("timeout"); }, [left]); // eslint-disable-line

  const buildSTAR = useCallback(
    (s: { s: string; t: string; a: string; r: string }) =>
      [`상황: ${s.s.trim()}`, `과제: ${s.t.trim()}`, `행동: ${s.a.trim()}`, `결과: ${s.r.trim()}`].filter(Boolean).join("\n"),
    []
  );

  const [star, setStar] = useState({ s: "", t: "", a: "", r: "" });

  async function onNext(_: "answered" | "skipped" | "timeout") {
    if (!q.current || !sessionId) return;

    await q.commit();

    if (q.index < q.list.length - 1) {
      q.next();
      setStar({ s: "", t: "", a: "", r: "" });
      return;
    }

    await finish();
    nav("/result", { state: { sessionId } });
  }

  if (!started || !sessionId) return <div className="vstack"><h1>세션을 시작하는 중…</h1></div>;
  if (!q.current) return <div className="vstack"><h1>문항이 없습니다.</h1></div>;

  const Section = ({ title, items }: { title: string; items?: string[] | null }) =>
    items && items.length ? (
      <details open style={{ marginTop: 6 }}>
        <summary className="small" style={{ color: "#9ca3af" }}>{title}</summary>
        <ul className="small" style={{ marginTop: 4 }}>
          {items.map((t, i) => <li key={i}>{t}</li>)}
        </ul>
      </details>
    ) : null;

  const kwHit = Array.isArray((q.ai as any)?.keywords?.hit) ? (q.ai as any).keywords.hit.length : 0;
  const kwMiss = Array.isArray((q.ai as any)?.keywords?.miss) ? (q.ai as any).keywords.miss.length : 0;

  return (
    <div className="vstack" style={{ gap: 12 }}>
      <div className="hstack" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <h1>Q{q.index + 1}/{q.list.length}</h1>
        <div className="badge">남은 시간 {left}s</div>
      </div>

      <div className="card" style={{ padding: 16 }}>
        <b>{q.current.text}</b>
      </div>

      {opt.starCoach ? (
        <div className="grid2">
          <div className="vstack">
            <label className="small">상황 (S)</label>
            <textarea className="input" rows={4}
              value={star.s}
              onChange={(e) => { const v = { ...star, s: e.target.value }; setStar(v); q.setAnswer(buildSTAR(v)); }} />
            <label className="small">과제 (T)</label>
            <textarea className="input" rows={3}
              value={star.t}
              onChange={(e) => { const v = { ...star, t: e.target.value }; setStar(v); q.setAnswer(buildSTAR(v)); }} />
          </div>
          <div className="vstack">
            <label className="small">행동 (A)</label>
            <textarea className="input" rows={4}
              value={star.a}
              onChange={(e) => { const v = { ...star, a: e.target.value }; setStar(v); q.setAnswer(buildSTAR(v)); }} />
            <label className="small">결과 (R)</label>
            <textarea className="input" rows={3}
              value={star.r}
              onChange={(e) => { const v = { ...star, r: e.target.value }; setStar(v); q.setAnswer(buildSTAR(v)); }} />
          </div>
        </div>
      ) : (
        <textarea className="input" rows={8}
          value={q.draft}
          onChange={(e) => q.setAnswer(e.target.value)}
          placeholder="핵심부터 간결하게 작성해 보세요…" />
      )}

      <div className="card" style={{ padding: 12 }}>
        <div className="hstack" style={{ justifyContent: "space-between" }}>
          <b>AI 피드백(자동)</b>
          {q.grading && <span className="small" style={{ color: "#9ca3af" }}>채점 중…</span>}
        </div>
        {!q.ai ? (
          <div className="small" style={{ color: "#9ca3af" }}>입력이 충분해지면 자동으로 피드백이 나타납니다.</div>
        ) : (
          <div className="vstack" style={{ gap: 6, marginTop: 6 }}>
            <div className="hstack" style={{ gap: 8, flexWrap: "wrap" }}>
              <span className="badge">점수 {q.ai.score}</span>
              <span className="badge">등급 {q.ai.grade}</span>
              {kwHit ? <span className="badge">키워드(Hit) {kwHit}</span> : null}
              {kwMiss ? <span className="badge">누락(Miss) {kwMiss}</span> : null}
            </div>
            {q.ai.summary && (<><div className="small" style={{ color: "#9ca3af" }}>요약</div><div>{q.ai.summary}</div></>)}

            {/* 딥 섹션 */}
            <Section title="잘한 점" items={(q.ai as any).strengths} />
            <Section title="보완 포인트" items={(q.ai as any).gaps} />
            <Section title="추가하면 좋은 내용" items={(q.ai as any).adds} />
            <Section title="주의할 점" items={(q.ai as any).pitfalls} />
            {/* next: 배열로 표준화 */}
            <Section title="다음 답변 가이드" items={Array.isArray((q.ai as any).next) ? (q.ai as any).next : undefined} />

            {(q.ai as any).tips?.length ? (
              <>
                <div className="small" style={{ color: "#9ca3af" }}>개선 팁</div>
                <ul className="small">{(q.ai as any).tips.map((t: string,i: number)=><li key={i}>{t}</li>)}</ul>
              </>
            ) : null}
            {(q.ai as any).polished && (
              <>
                <div className="small" style={{ color: "#9ca3af" }}>다듬은 답변</div>
                <div style={{ whiteSpace: "pre-wrap" }}>{(q.ai as any).polished}</div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="hstack" style={{ justifyContent: "space-between" }}>
        <button className="btn" onClick={() => onNext("skipped")}>건너뛰기</button>
        <button className="btn brand" onClick={() => onNext("answered")}>다음</button>
      </div>
    </div>
  );
}
