// src/pages/Result.tsx
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import Radar, { RadarDatum } from "../components/Radar";
import { createStory } from "../api/mockStories";
import http from "../api/http";
import { getSessionQuestions, getSessionSummary } from "../api/interview";
import { useAuth } from "../api/mockAuth";
import AiFeedback from "../components/AiFeedback";

type QSItem = {
  id: number; questionId: number | null; text: string; category: string | null; orderNo: number;
  answer?: string | null; score?: number | null; feedback?: string | null; durationMs?: number | null;
};
type Summary = {
  total: number; answered: number; avgScore: number | null; durationMs: number;
  byCategory?: Array<{ category: string | null; count: number; avgScore: number | null }>;
};
type LocationState = { sessionId: number; company?: string | null } | null;

const TOPIC_LABEL: Record<string, string> = {
  motivation: "지원동기", failure: "실패/교훈", leadership: "리더십", teamwork: "협업", project: "프로젝트",
  optimization: "최적화", traffic: "트래픽/스케일", security: "보안", testing: "테스트", architecture: "아키텍처",
  data: "데이터/지표", legacy: "레거시개선", incident: "장애대응", automation: "자동화",
  time_mgmt: "시간관리", learning: "학습/성장", general: "일반", tech: "기술", behavior: "행동",
};

function useQuery() { return new URLSearchParams(window.location.search); }

function downloadJSON(fileName: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = fileName;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

export default function Result() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { state } = useLocation() as { state: LocationState };
  const q = useQuery();

  const stateSid = state?.sessionId ?? null;
  const querySid = q.get("sid") ? Number(q.get("sid")) : null;
  const sessionId = stateSid || querySid;

  const [company, setCompany] = useState<string | null>(state?.company ?? null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [items, setItems] = useState<QSItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandAll, setExpandAll] = useState(true);

  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      try {
        const r = await http.get(`/api/sessions/${sessionId}`);
        setCompany(r.data?.item?.company ?? null);
      } catch {}
    })();
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const [s, qs] = await Promise.all([getSessionSummary(sessionId), getSessionQuestions(sessionId)]);
        if (!alive) return;
        setSummary({
          total: s.total, answered: s.answered, avgScore: s.avgScore ?? null, durationMs: s.durationMs, byCategory: s.byCategory ?? [],
        });
        setItems(qs);
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [sessionId]);

  const { radar, weakTopics, answeredCount, timeoutsCount, totalPossible, sumScore, avgScore } = useMemo(() => {
    const byCat = new Map<string, { s: number; c: number }>();
    let sum = 0, cnt = 0, timeouts = 0;
    items.forEach((it) => {
      const key = (it.category || "general").toString();
      if (!byCat.has(key)) byCat.set(key, { s: 0, c: 0 });
      const node = byCat.get(key)!;
      if (it.score != null) { sum += Number(it.score); cnt += 1; node.s += it.score; node.c += 1; }
      if (!it.answer && (it.durationMs ?? 0) > 0) timeouts += 1;
    });
    const radar: RadarDatum[] = Array.from(byCat.entries()).map(([k, v]) => ({
      label: TOPIC_LABEL[k] || k, value: Math.round(v.s / Math.max(1, v.c)),
    }));
    const weakTopics = Array.from(byCat.entries())
      .map(([k, v]) => ({ k, a: v.s / Math.max(1, v.c) }))
      .sort((a, b) => a.a - b.a).slice(0, 2).map((x) => x.k);

    return {
      radar, weakTopics,
      answeredCount: items.filter((i) => !!i.answer).length,
      timeoutsCount: timeouts,
      totalPossible: cnt * 100,
      sumScore: sum, avgScore: cnt ? Math.round(sum / cnt) : 0,
    };
  }, [items]);

  if (!sessionId) {
    return (
      <div className="vstack">
        <h1>결과 정보를 찾을 수 없어요.</h1>
        <button className="btn" onClick={() => nav("/")}>홈으로</button>
      </div>
    );
  }

  function startWeakRetry() {
    let last: any = { count: 10, difficulty: "normal", starCoach: true };
    try { last = { ...last, ...(JSON.parse(localStorage.getItem("im-last-options") || "{}")) }; } catch {}
    const opts = { ...last, count: 10 };
    nav(`/interview/${(company || "custom").toLowerCase()}`, { state: { options: opts, topicFilters: weakTopics } });
  }

  function saveStoryFromItem(it: QSItem, idx: number) {
    if (!user) { alert("로그인 후 사용해주세요."); return; }
    if (!it.answer || !it.answer.trim()) { alert("내용이 없는 답변은 저장할 수 없습니다."); return; }
    const topic = (it.category || "general").toString();
    const topicLabel = TOPIC_LABEL[topic] || topic;

    // 답변 + AI 피드백(완본) 동시 저장
    const merged = it.feedback
      ? `${it.answer}\n\n---\n[AI 피드백]\n${it.feedback}`
      : it.answer;

    createStory(user.id, {
      title: `Q${idx + 1} · ${topicLabel} · ${company || "세션"}`,
      content: merged,
      companyId: (company || "custom").toLowerCase(),
      topic,
      tags: [topicLabel],
      aiScore: it.score ?? null,
      aiFeedback: it.feedback ?? null,
    });
    alert("스토리뱅크에 저장했습니다.");
  }

  function exportJSON() {
    const data = { sessionId, company, summary, items, exportedAt: new Date().toISOString() };
    downloadJSON(`session_${sessionId}.json`, data);
  }

  const total = summary?.total ?? items.length;
  const durSec = Math.round((summary?.durationMs ?? 0) / 1000);

  return (
    <div className="vstack" style={{ gap: 16 }}>
      <h1>{company ?? "세션"} · 결과 요약</h1>

      <div className="card" style={{ padding: 20, display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16 }}>
        <div className="vstack" style={{ gap: 16 }}>
          <div style={{ background: "#0e1120", border: "1px solid #1e2738", borderRadius: 14, padding: 16 }}>
            <div className="small" style={{ color: "#9aa3b2" }}>총점</div>
            <div style={{ fontSize: 40, fontWeight: 800 }}>
              {sumScore} <span className="small" style={{ color: "#9aa3b2" }}>/ {totalPossible}</span>
            </div>
            <div className="small" style={{ color: "#9aa3b2" }}>
              채점 문항 {summary?.answered ?? 0}개 기준 · 평균 {avgScore}점 · 소요 {durSec}s
            </div>
          </div>

          <div className="card" style={{ padding: 16 }}>
            <b>약한 영역 추천</b>
            <div className="small" style={{ color: "#9aa3b2", marginTop: 6 }}>
              최근 세션 분석 결과 약한 영역:{" "}
              {weakTopics.length ? weakTopics.map(t => TOPIC_LABEL[t] || t).join(", ") : "분석할 데이터가 부족합니다."}
            </div>
            <div className="hstack" style={{ justifyContent: "flex-end", marginTop: 10 }}>
              <button className="btn brand" disabled={weakTopics.length === 0} onClick={startWeakRetry}>
                약한 영역 10문항 리트라이
              </button>
            </div>
          </div>
        </div>

        <div className="vstack" style={{ alignItems: "center" }}>
          <div className="small" style={{ color: "#9aa3b2", marginBottom: 8 }}>카테고리별 평균 점수</div>
          {radar.length > 0 ? <Radar data={radar} size={300} /> : <div className="small">표시할 데이터가 없습니다.</div>}
        </div>
      </div>

      <div className="card" style={{ padding: 16 }}>
        <p className="hstack" style={{ gap: 16, flexWrap: "wrap" }}>
          <span className="badge">총 문항 {total}</span>
          <span className="badge">제출 {answeredCount}</span>
          <span className="badge">시간초과 {timeoutsCount}</span>
          <span className="badge">{loading ? "불러오는 중…" : "완료"}</span>
        </p>

        <div className="hstack" style={{ justifyContent: "space-between", marginTop: 8 }}>
          <div className="small" style={{ color: "#9ca3af" }}>AI 점수/피드백은 실시간 채점 결과를 표시합니다.</div>
          <button className="btn" onClick={() => setExpandAll((v) => !v)}>{expandAll ? "모두 접기" : "모두 펼치기"}</button>
        </div>

        <div className="section">
          <h2>문항별 AI 피드백</h2>
          <ul>
            {items.map((it, i) => {
              const score = it.score ?? null;
              const title = !it.answer ? "미제출" : score == null ? "채점 대기" : `점수 ${score}점`;
              const canSave = !!it.answer && it.answer.trim().length > 0;
              const catLabel = TOPIC_LABEL[it.category || "general"] || (it.category || "기타");
              return (
                <li key={it.id} className="card" style={{ padding: 16, marginBottom: 12 }}>
                  <div className="hstack" style={{ justifyContent: "space-between" }}>
                    <div className="hstack" style={{ gap: 10, flexWrap: "wrap" }}>
                      <div className="badge">Q{i + 1}</div>
                      <b>{title}</b>
                      <span className="badge">{catLabel}</span>
                      {it.durationMs != null && <span className="badge">{Math.round(it.durationMs / 1000)}s</span>}
                    </div>
                    <div className="hstack" style={{ gap: 8 }}>
                      <button className="btn" disabled={!canSave} title={canSave ? "스토리뱅크에 저장" : "빈 답변은 저장 불가"} onClick={() => saveStoryFromItem(it, i)}>
                        ☆ 스토리 저장
                      </button>
                    </div>
                  </div>

                  <div className="small" style={{ color: "#9ca3af", marginTop: 8 }}>질문</div>
                  <div style={{ whiteSpace: "pre-wrap" }}>{it.text}</div>

                  {it.answer && (
                    <>
                      <div className="small" style={{ color: "#9ca3af", marginTop: 10 }}>내 답변</div>
                      <div style={{ whiteSpace: "pre-wrap" }}>{it.answer}</div>
                    </>
                  )}

                  {it.feedback && (
                    <details open={expandAll} style={{ marginTop: 10 }}>
                      <summary><b>AI 피드백</b></summary>
                      <div className="card" style={{ padding: 12, background: "#0d1018", marginTop: 8 }}>
                        <AiFeedback
                          feedback={it.feedback || ""}
                          score={it.score ?? null}
                          answer={it.answer ?? ""}
                          question={it.text}
                        />
                      </div>
                    </details>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="hstack" style={{ marginTop: 12, justifyContent: "space-between" }}>
          <Link to="/companies" className="btn">다른 기업으로</Link>
          <button className="btn brand" onClick={exportJSON}>JSON 내보내기</button>
        </div>
      </div>
    </div>
  );
}
