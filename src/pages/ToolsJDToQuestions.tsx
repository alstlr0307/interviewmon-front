// src/pages/ToolsJDToQuestions.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { startSession, attachQuestions } from "../api/interview";

function extractKeywords(text: string) {
  return text
    .split(/\n+/)
    .map(s => s.trim())
    .filter(Boolean);
}

export default function ToolsJDToQuestions() {
  const nav = useNavigate();
  const [companyKey, setCompanyKey] = useState("custom");
  const [raw, setRaw] = useState("");
  const [busy, setBusy] = useState(false);

  async function run() {
    if (!raw.trim()) { alert("JD 텍스트를 입력해주세요."); return; }
    setBusy(true);
    try {
      // 1) 빈 세션 생성 (0문항)
      const { sessionId } = await startSession(companyKey, { count: 0 });

      // 2) JD에서 문장/키워드 추출 → attach
      const qs = extractKeywords(raw).map((t) => ({ text: t, category: null, questionId: null }));
      if (qs.length === 0) { alert("추출된 문항이 없습니다."); return; }

      await attachQuestions(sessionId, qs, { replace: true });

      // 3) 인터뷰 페이지로 이동
      nav(`/interview/${companyKey}?sid=${sessionId}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="vstack" style={{ gap: 12 }}>
      <h1>JD → 질문 변환</h1>
      <label>기업 키</label>
      <input className="input" value={companyKey} onChange={e => setCompanyKey(e.target.value)} />
      <label>JD 텍스트</label>
      <textarea className="input" rows={12} value={raw} onChange={e => setRaw(e.target.value)} />
      <button className="btn brand" onClick={run} disabled={busy}>
        {busy ? "전환 중…" : "세션 생성 & 문항 attach"}
      </button>
    </div>
  );
}
