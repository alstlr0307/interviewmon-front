/**
 * 기업 선택 (로고 타일 UI)
 * - 로고 경로를 다중 후보로 순차 시도(companies.ts 지정값 → /logos/*.svg|png → /루트/*.svg|png → 대/소문자)
 * - 전부 실패 시 폴백 아바타 렌더
 * - 선택/옵션/라우팅/저장 동작 동일
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { COMPANIES } from "../data/companies";

type StartOptions = {
  count: number;
  difficulty: "easy" | "normal" | "hard";
  starCoach: boolean;
  jobTitle: string | null;
};

type CompanyView = {
  id: string;
  name: string;
  short: string;
  color: string;
  logo?: string;
};

const toPublic = (p?: string) =>
  !p ? "" : p.startsWith("/") || /^https?:\/\//i.test(p) ? p : `/${p}`;

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s);

const uniq = <T,>(arr: T[]) => Array.from(new Set(arr)).filter(Boolean) as T[];

const LIST: CompanyView[] = COMPANIES.map((c: any) => {
  const id = String(c.key ?? c.id);
  return {
    id,
    name: String(c.name),
    short: String(c.short ?? c.name ?? id),
    color: String(c.color ?? "#7c3aed"),
    logo: c.logo ? String(c.logo) : undefined,
  };
});

/** 여러 경로를 순차로 시도하고, 전부 실패하면 fallback을 렌더 */
function ChainImg({
  sources,
  alt,
  style,
  fallback,
}: {
  sources: string[];
  alt: string;
  style?: React.CSSProperties;
  fallback?: React.ReactNode;
}) {
  const [idx, setIdx] = useState(0);
  const src = sources[idx];
  if (!src) return <>{fallback ?? null}</>;
  return (
    <img
      src={src}
      alt={alt}
      style={style}
      onError={() => setIdx((i) => i + 1)}
    />
  );
}

export default function Companies() {
  const nav = useNavigate();
  const companies = useMemo(() => LIST, []);

  const [selected, setSelected] = useState<string>(() => {
    const saved = localStorage.getItem("im-last-company") || "";
    return companies.some((c) => c.id === saved) ? saved : companies[0]?.id || "";
  });

  const [opt, setOpt] = useState<StartOptions>(() => {
    const base: StartOptions = { count: 10, difficulty: "normal", starCoach: true, jobTitle: null };
    try {
      const stored = JSON.parse(localStorage.getItem("im-last-options") || "{}");
      return { ...base, ...(stored || {}) };
    } catch {
      return base;
    }
  });

  const onStart = () => {
    const companyId = selected?.trim();
    if (!companyId) return alert("기업을 먼저 선택해주세요.");
    localStorage.setItem("im-last-options", JSON.stringify(opt));
    localStorage.setItem("im-last-company", companyId);
    nav(`/interview/${encodeURIComponent(companyId)}?company=${encodeURIComponent(companyId)}`, {
      state: { options: opt, companyId },
      replace: true,
    });
  };

  const onCancel = () => setSelected("");

  const diffLabel = (d: StartOptions["difficulty"]) =>
    d === "easy" ? "쉬움" : d === "normal" ? "보통" : "어려움";

  return (
    <div className="vstack" style={{ gap: 18 }}>
      <h1>기업 선택</h1>
      <p className="small" style={{ color: "#9aa3b2" }}>
        각 기업 50문항 · 매회 랜덤 · 지원동기 문항 우선 등장
      </p>

      <div
        className="grid3 companies-grid"
        style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(240px, 1fr))", gap: 16 }}
      >
        {companies.map((c) => {
          const active = selected === c.id;
          const idL = c.id.toLowerCase();
          const idU = c.id.toUpperCase();
          const idC = cap(idL);

          // ✅ 후보 경로: companies.ts → /logos → 루트, svg→png 모두 시도
          const guesses = uniq<string>([
            toPublic(c.logo), // /logos/samsung.svg 같은 명시값
            `/logos/${idL}.svg`,
            `/logos/${idL}.png`,
            `/logos/${idU}.svg`,
            `/logos/${idU}.png`,
            `/${idL}.svg`,
            `/${idL}.png`,
            `/${idU}.svg`,
            `/${idU}.png`,
            `/${idC}.svg`,
            `/${idC}.png`,
          ]);

          const fallback = (
            <div
              aria-hidden
              style={{
                width: 64,
                height: 36,
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, rgba(99,102,241,.25), rgba(124,58,237,.25))",
                border: "1px dashed rgba(124,58,237,.35)",
              }}
            >
              <span style={{ fontWeight: 800, letterSpacing: 1, fontSize: 12, color: "#c7c9ff" }}>
                {initials(c.name)}
              </span>
            </div>
          );

          return (
            <button
              key={c.id}
              onClick={() => setSelected(c.id)}
              className={`card company-tile ${active ? "is-active" : ""}`}
              aria-pressed={active}
              data-company={c.id}
              style={{
                textAlign: "left",
                padding: 16,
                border: active ? `2px solid ${c.color}` : "1px solid rgba(255,255,255,0.07)",
                boxShadow: active ? `0 0 0 4px ${c.color}22 inset` : "none",
                background: "radial-gradient(1200px 300px at 0% 0%, #121429 0%, #0b0d18 60%)",
              }}
              title={c.name}
            >
              <div className="logo" style={{ height: 40, display: "flex", alignItems: "center" }}>
                <ChainImg
                  sources={guesses}
                  alt={`${c.name} 로고`}
                  style={{ maxHeight: 36, maxWidth: 120, objectFit: "contain", borderRadius: 8 }}
                  fallback={fallback}
                />
              </div>

              <div className="hstack" style={{ justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                <span className="en badge" style={{ whiteSpace: "nowrap" }}>
                  {c.short.toUpperCase()}
                </span>
                {active ? (
                  <span
                    className="badge"
                    style={{ whiteSpace: "nowrap", background: "rgba(124,58,237,.15)", borderColor: "rgba(124,58,237,.35)" }}
                  >
                    선택됨
                  </span>
                ) : null}
              </div>

              <div
                className="ko small"
                style={{ marginTop: 6, color: "#9ca3af", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
              >
                {c.name}
              </div>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="vstack section card" style={{ padding: 18, gap: 14 }}>
          <div className="hstack" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <h2>시작 옵션</h2>
            <button className="btn" onClick={onCancel}>닫기</button>
          </div>

          <div className="vstack" style={{ gap: 8 }}>
            <label>문항 수</label>
            <input
              className="input"
              type="number"
              min={1}
              max={50}
              value={opt.count}
              onChange={(e) =>
                setOpt((v) => ({ ...v, count: Math.min(50, Math.max(1, parseInt(e.target.value || "10", 10))) }))
              }
            />
          </div>

          <div className="vstack" style={{ gap: 8 }}>
            <label>난이도</label>
            <div className="hstack" style={{ gap: 10, flexWrap: "wrap" }}>
              {(["easy", "normal", "hard"] as const).map((d) => (
                <button
                  key={d}
                  className={`btn ${opt.difficulty === d ? "brand" : ""}`}
                  style={{ minWidth: 104, fontWeight: 800 }}
                  onClick={() => setOpt((v) => ({ ...v, difficulty: d }))}
                >
                  {diffLabel(d)}
                </button>
              ))}
            </div>
          </div>

          <div className="vstack" style={{ gap: 8 }}>
            <label>직무(선택)</label>
            <input
              className="input"
              placeholder="예: 프론트엔드"
              value={opt.jobTitle ?? ""}
              onChange={(e) => setOpt((v) => ({ ...v, jobTitle: e.target.value || null }))}
            />
          </div>

          <div className="card" style={{ padding: 14 }}>
            <div className="hstack" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <b style={{ fontSize: 17 }}>STAR 코치 모드</b>
              <input
                type="checkbox"
                checked={opt.starCoach}
                onChange={(e) => setOpt((v) => ({ ...v, starCoach: e.target.checked }))}
                style={{ transform: "scale(1.45)", width: 24, height: 24, accentColor: "#7c3aed" }}
                aria-label="STAR 코치 모드"
              />
            </div>
            <div className="small" style={{ color: "#9aa3b2", marginTop: 6 }}>
              상황(S) · 과제(T) · 행동(A) · 결과(R) 4칸으로 나눠 입력 후 자동 합성합니다.
            </div>
          </div>

          <div className="hstack" style={{ justifyContent: "flex-end", gap: 10 }}>
            <button className="btn" onClick={onCancel}>취소</button>
            <button className="btn brand" onClick={onStart}>시작</button>
          </div>
        </div>
      )}
    </div>
  );
}
