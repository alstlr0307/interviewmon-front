// src/pages/AdminQuestions.tsx
import { useMemo, useState } from "react";
import { loadQuestions, upsertQuestion, removeQuestion } from "../api/mockQuestions";
import { COMPANIES } from "../data/companies";
import type { QuestionItem } from "../types";
import { safeUUID } from "../utils/uuid";

type CompanyOpt = { id: string; name: string };

const COMPANY_OPTIONS: CompanyOpt[] = COMPANIES.map((c) => ({
  id: (c as any).key ?? (c as any).id ?? "custom",
  name: c.name,
}));

export default function AdminQuestions() {
  const companies: CompanyOpt[] =
    COMPANY_OPTIONS.length ? COMPANY_OPTIONS : [{ id: "custom", name: "사용자 지정" }];

  const [list, setList] = useState<QuestionItem[]>(loadQuestions());
  const [q, setQ] = useState("");

  const [draft, setDraft] = useState<QuestionItem>({
    id: "",
    companyId: companies[0].id,
    text: "",
    timeLimit: 60,
    active: true,
    difficulty: 2,
  } as QuestionItem);

  const view = useMemo(() => {
    const lower = q.toLowerCase();
    return (list || [])
      .filter((x) => (x.text || "").toLowerCase().includes(lower))
      .sort((a, b) =>
        ((a.companyId || "") + (a.text || "")).localeCompare(
          (b.companyId || "") + (b.text || "")
        )
      );
  }, [list, q]);

  function resetDraft() {
    setDraft({
      id: "",
      companyId: companies[0].id,
      text: "",
      timeLimit: 60,
      active: true,
      difficulty: 2,
    } as QuestionItem);
  }

  function onSave() {
    const item: QuestionItem = {
      ...draft,
      id: draft.id || safeUUID(),
      text: (draft.text || "").trim(),
      timeLimit: Math.max(15, Number(draft.timeLimit) | 0),
    } as QuestionItem;

    upsertQuestion(item);
    setList(loadQuestions());
    resetDraft();
  }

  return (
    <div className="vstack" style={{ gap: 16 }}>
      <h1>관리자 · 질문 뱅크</h1>

      <div className="grid2">
        <div className="card" style={{ padding: 16 }}>
          <h2>질문 추가/수정</h2>

          <label>회사</label>
          <select
            className="input"
            value={draft.companyId}
            onChange={(e) => setDraft({ ...draft, companyId: e.target.value })}
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <label>질문</label>
          <textarea
            className="input"
            rows={4}
            value={draft.text}
            onChange={(e) => setDraft({ ...draft, text: e.target.value })}
          />

          <label>시간(초)</label>
          <input
            className="input"
            type="number"
            value={draft.timeLimit}
            onChange={(e) =>
              setDraft({
                ...draft,
                timeLimit: Math.max(0, parseInt(e.target.value || "0", 10) || 0),
              })
            }
          />

          <div className="hstack" style={{ justifyContent: "space-between" }}>
            <div className="hstack">
              <label>활성</label>
              <input
                type="checkbox"
                checked={!!draft.active}
                onChange={(e) =>
                  setDraft({ ...draft, active: e.target.checked })
                }
              />
            </div>

            <button className="btn brand" onClick={onSave}>
              {draft.id ? "수정" : "추가"}
            </button>
          </div>
        </div>

        <div className="card" style={{ padding: 16 }}>
          <div className="hstack" style={{ justifyContent: "space-between" }}>
            <h2>질문 목록</h2>
            <input
              className="input"
              placeholder="검색…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ maxWidth: 240 }}
            />
          </div>

          <div className="section" style={{ maxHeight: 420, overflow: "auto" }}>
            {view.map((item) => (
              <div
                key={item.id}
                className="hstack"
                style={{
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderBottom: "1px dashed #20283a",
                }}
              >
                <div className="small">{item.companyId}</div>

                <div style={{ flex: 1, margin: "0 8px" }} className="small">
                  {item.text}
                </div>

                <div className="small">{item.timeLimit}s</div>

                <div className="hstack">
                  <button className="btn" onClick={() => setDraft(item)}>
                    수정
                  </button>
                  <button
                    className="btn"
                    onClick={() => {
                      removeQuestion(item.id);
                      setList(loadQuestions());
                    }}
                  >
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
