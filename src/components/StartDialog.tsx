/**
 * components/StartDialog.tsx
 * - 모의면접 시작 옵션 설정 다이얼로그
 * - 문항 수 / 난이도 / STAR 코치 모드 포함
 */
import React, { useEffect, useState } from "react";

export type StartOptions = {
  perQuestionSec: number;
  count: number;
  difficulty: "easy" | "normal" | "hard";
  starCoach?: boolean;
};

export default function StartDialog({
  open,
  onClose,
  onStart,
}: {
  open: boolean;
  onClose: () => void;
  onStart: (opts: StartOptions) => void;
}) {
  const last = (() => {
    try { return JSON.parse(localStorage.getItem("im-last-options") || "{}"); } catch { return {}; }
  })();

  const [count, setCount] = useState<number>(last.count ?? 10);
  const [difficulty, setDifficulty] = useState<"easy" | "normal" | "hard">(last.difficulty ?? "normal");
  const [starCoach, setStarCoach] = useState<boolean>(last.starCoach ?? true);

  // perQuestionSec은 현재 문항별 timeLimit(30/60) 사용하므로 의미상 0 유지
  const perQuestionSec = 0;

  useEffect(() => {
    function onEsc(e: KeyboardEvent){ if (e.key === "Escape") onClose(); }
    if (open) window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  function submit(){
    const opts: StartOptions = { perQuestionSec, count, difficulty, starCoach };
    localStorage.setItem("im-last-options", JSON.stringify(opts));
    onStart(opts);
  }

  return (
    <div className="modal show">
      <div className="modal-card">
        <div className="modal-head">
          <h3>시작 옵션</h3>
          <button className="btn ghost" onClick={onClose}>닫기</button>
        </div>

        <div className="vstack" style={{gap:12}}>
          <label>문항 수</label>
          <input
            className="input"
            type="number"
            min={5} max={20}
            value={count}
            onChange={(e)=>setCount(Math.max(5, Math.min(20, Number(e.target.value)||10)))}
          />

          <label>난이도</label>
          <div className="hstack" style={{gap:8}}>
            {(["easy","normal","hard"] as const).map(d => (
              <button
                key={d}
                className={`btn ${difficulty===d ? "brand" : ""}`}
                type="button"
                onClick={()=>setDifficulty(d)}
              >
                {d==="easy"?"쉬움":d==="normal"?"보통":"어려움"}
              </button>
            ))}
          </div>

          <div className="card" style={{padding:12}}>
            <div className="hstack" style={{justifyContent:"space-between", alignItems:"center"}}>
              <div>
                <b>STAR 코치 모드</b>
                <div className="small" style={{color:"var(--muted)"}}>
                  상황(S)·과제(T)·행동(A)·결과(R) 4칸에 나눠 입력하고 자동 합성합니다.
                </div>
              </div>
              <label className="switch">
                <input type="checkbox" checked={starCoach} onChange={(e)=>setStarCoach(e.target.checked)} />
                <span className="slider" />
              </label>
            </div>
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn" onClick={onClose}>취소</button>
          <button className="btn brand" onClick={submit}>시작</button>
        </div>
      </div>
    </div>
  );
}
