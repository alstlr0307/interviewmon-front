import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

/* =============================================================
 * Props (백엔드 스키마 100% 호환)
 * ============================================================= */
type AIFeedbackItem = { text: string; level: number | null };
type AIFollowItem = string | { question: string; reason?: string };

type Props = {
  feedback?: string | null;
  score?: number | null;
  answer?: string | null;
  question?: string | null;

  summary_interviewer?: string | null;
  summary_coach?: string | null;

  strengths?: any[] | null;
  gaps?: any[] | null;
  adds?: any[] | null;
  pitfalls?: AIFeedbackItem[] | null;
  next?: any[] | null;

  polished?: string | null;
  keywords?: string[] | null;
  category?: string | null;

  chart?: Record<string, number | string> | null;

  follow_up_questions?: AIFollowItem[] | null;
};

/* =============================================================
 * Normalize util
 * ============================================================= */
const normalizeList = (arr?: any[] | null): string[] => {
  if (!arr) return [];
  return arr
    .map((v) => {
      if (typeof v === "string") return v;
      if (v && typeof v.text === "string") return v.text;
      return "";
    })
    .filter(Boolean);
};

const normalizePitfalls = (arr?: AIFeedbackItem[] | null): AIFeedbackItem[] => {
  if (!arr) return [];
  return arr
    .map((v) => {
      if (!v) return null;
      if (typeof v === "string") return { text: v, level: null };
      const t = v.text ?? "";
      return t ? { text: t, level: Number.isFinite(v.level) ? v.level : null } : null;
    })
    .filter(Boolean) as AIFeedbackItem[];
};

const normalizeChart = (chart?: Record<string, number | string> | null) => {
  if (!chart) return {};
  const out: Record<string, number> = {};
  Object.entries(chart).forEach(([k, v]) => {
    const num = typeof v === "string" ? Number(v) : v;
    out[k] = Number.isFinite(num) ? num : 0;
  });
  return out;
};

/* =============================================================
 * STAR / Specificity 분석
 * ============================================================= */
function analyzeSTAR(a?: string | null) {
  const text = a || "";
  const s = /상황|배경|환경/.test(text);
  const t = /과제|문제|목표/.test(text);
  const act = /행동|실행|시도|조치/.test(text);
  const r = /결과|성과|지표|효과/.test(text);
  return { S: s, T: t, A: act, R: r, score: [s, t, act, r].filter(Boolean).length * 25 };
}

function analyzeSpecificity(a?: string | null) {
  const text = a || "";
  const metrics = (text.match(/\d+|%|ms|분|시간|지표/gi) || []).length;
  const detail = /(trade|가설|원인|비교|효율)/i.test(text);
  const clarity = /(명확|구체|정량)/i.test(text);
  return {
    metrics,
    detail,
    clarity,
    score: Math.min(100, metrics * 15 + (detail ? 25 : 0) + (clarity ? 20 : 0)),
  };
}

/* =============================================================
 * Section 카드 (더 고급스럽게)
 * ============================================================= */
const CardSection = ({
  icon,
  title,
  color,
  children,
}: {
  icon: string;
  title: string;
  color: string;
  children: React.ReactNode;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx(
        "rounded-xl border p-6 space-y-3",
        "backdrop-blur-xl shadow-lg",
        color
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </div>
      {children}
    </motion.div>
  );
};

/* =============================================================
 * Follow-up 아코디언
 * ============================================================= */
const Accordion = ({ q }: { q: AIFollowItem }) => {
  const [open, setOpen] = useState(false);

  const question = typeof q === "string" ? q : q.question;
  const reason = typeof q === "string" ? "" : q.reason;

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex justify-between items-center py-2 text-left text-gray-200 hover:text-white"
      >
        <span>• {question}</span>
        <span>{open ? "▲" : "▼"}</span>
      </button>

      <AnimatePresence>
        {open && reason && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="pl-4 text-sm text-gray-400"
          >
            {reason}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* =============================================================
 * 메인 컴포넌트
 * ============================================================= */
export default function AiFeedback({
  feedback,
  score,
  answer,
  summary_interviewer,
  summary_coach,
  strengths,
  gaps,
  adds,
  pitfalls,
  next,
  polished,
  keywords,
  chart,
  follow_up_questions,
}: Props) {
  const star = useMemo(() => analyzeSTAR(answer), [answer]);
  const spec = useMemo(() => analyzeSpecificity(answer), [answer]);

  const pit = normalizePitfalls(pitfalls);
  const str = normalizeList(strengths);
  const gap = normalizeList(gaps);
  const add = normalizeList(adds);
  const nxt = normalizeList(next);

  const kw = keywords ?? [];
  const safeChart = normalizeChart(chart);

  const radarData =
    Object.keys(safeChart).length > 0
      ? Object.entries(safeChart).map(([key, val]) => ({
          subject:
            {
              star_s: "상황",
              star_t: "과제",
              star_a: "행동",
              star_r: "결과",
              quant: "정량성",
              logic: "논리성",
              tech: "기술성",
              fit: "적합도",
              brevity: "간결성",
              risk: "위험관리",
            }[key] || key,
          A: val,
          fullMark: 100,
        }))
      : [
          { subject: "상황", A: star.S ? 100 : 40, fullMark: 100 },
          { subject: "과제", A: star.T ? 100 : 40, fullMark: 100 },
          { subject: "행동", A: star.A ? 100 : 40, fullMark: 100 },
          { subject: "결과", A: star.R ? 100 : 40, fullMark: 100 },
          { subject: "특정성", A: spec.score, fullMark: 100 },
        ];

  return (
    <motion.div
      className="rounded-2xl border border-violet-600/40 bg-gradient-to-b from-[#0c0c20] to-[#0c0f29] p-8 space-y-10 shadow-[0_0_50px_rgba(139,92,246,0.25)]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-violet-300 to-sky-300 bg-clip-text text-transparent">
          🤖 AI 피드백 분석
        </h2>

        {score != null && (
          <div className="px-4 py-2 rounded-full bg-violet-600/30 text-violet-200 text-sm font-medium border border-violet-500/40 shadow">
            총점 {score}
          </div>
        )}
      </div>

      {/* SUMMARY */}
      {(summary_interviewer || summary_coach) && (
        <CardSection
          icon="📌"
          title="면접 핵심 요약"
          color="border-violet-500/40 bg-violet-800/10"
        >
          {summary_interviewer && (
            <p className="text-gray-300 leading-relaxed whitespace-pre-line">
              {summary_interviewer}
            </p>
          )}
          {summary_coach && (
            <p className="text-gray-300 leading-relaxed whitespace-pre-line">
              {summary_coach}
            </p>
          )}
        </CardSection>
      )}

      {/* GAUGES */}
      <div className="grid grid-cols-3 gap-6">
        <Gauge label="STAR 완성도" value={star.score} color="#a855f7" />
        <Gauge label="특정성" value={spec.score} color="#22d3ee" />
        <Gauge label="명확성" value={spec.clarity ? 100 : 50} color="#10b981" />
      </div>

      {/* RADAR */}
      <CardSection
        icon="📊"
        title="답변 구조 분석"
        color="border-slate-700 bg-slate-900/40"
      >
        <div className="w-full h-80 rounded-xl p-2">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
              <PolarGrid stroke="#3f3f46" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: "#c7d2fe", fontSize: 12 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
              <Radar dataKey="A" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.4} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </CardSection>

      {/* KEYWORDS */}
      {kw.length > 0 && (
        <CardSection
          icon="🔍"
          title="핵심 키워드"
          color="border-sky-500/40 bg-sky-800/10"
        >
          <p className="text-gray-300 text-sm leading-relaxed">{kw.join(", ")}</p>
        </CardSection>
      )}

      {/* POLISHED */}
      {polished && polished.trim().length > 0 && (
        <CardSection
          icon="📝"
          title="모범답변 (면접에서 그대로 말해도 됨)"
          color="border-emerald-500/40 bg-emerald-800/10"
        >
          <pre className="text-gray-200 text-[15px] whitespace-pre-wrap leading-relaxed">
            {polished}
          </pre>
        </CardSection>
      )}

      {/* STRENGTHS / GAPS / ADDS / PITFALLS / NEXT */}
      {str.length > 0 && (
        <CardSection
          icon="💪"
          title="강점 (Strengths)"
          color="border-emerald-500/40 bg-emerald-700/10"
        >
          <ul className="space-y-2 text-gray-300">
            {str.map((s, i) => (
              <li key={i}>• {s}</li>
            ))}
          </ul>
        </CardSection>
      )}

      {gap.length > 0 && (
        <CardSection
          icon="🩹"
          title="개선 포인트 (Gaps)"
          color="border-rose-500/40 bg-rose-700/10"
        >
          <ul className="space-y-2 text-gray-300">
            {gap.map((s, i) => (
              <li key={i}>• {s}</li>
            ))}
          </ul>
        </CardSection>
      )}

      {add.length > 0 && (
        <CardSection
          icon="➕"
          title="추가하면 더 좋은 내용 (Adds)"
          color="border-sky-500/40 bg-sky-700/10"
        >
          <ul className="space-y-2 text-gray-300">
            {add.map((s, i) => (
              <li key={i}>• {s}</li>
            ))}
          </ul>
        </CardSection>
      )}

      {pit.length > 0 && (
        <CardSection
          icon="⚠️"
          title="주의해야 할 위험 요소 (Pitfalls)"
          color="border-orange-500/40 bg-orange-700/10"
        >
          <ul className="space-y-2 text-gray-300">
            {pit.map((p, i) => (
              <li key={i}>
                • 레벨 {p.level ?? "?"}: {p.text}
              </li>
            ))}
          </ul>
        </CardSection>
      )}

      {nxt.length > 0 && (
        <CardSection
          icon="📈"
          title="다음 단계 (Next Steps)"
          color="border-indigo-500/40 bg-indigo-700/10"
        >
          <ul className="space-y-2 text-gray-300">
            {nxt.map((s, i) => (
              <li key={i}>• {s}</li>
            ))}
          </ul>
        </CardSection>
      )}

      {/* FOLLOW UP (Accordion) */}
      {follow_up_questions && follow_up_questions.length > 0 && (
        <CardSection
          icon="🎯"
          title="예상 후속 질문"
          color="border-yellow-500/40 bg-yellow-700/10"
        >
          <div className="space-y-2">
            {follow_up_questions.map((q, i) => (
              <Accordion key={i} q={q} />
            ))}
          </div>
        </CardSection>
      )}
    </motion.div>
  );
}

/* =============================================================
 * Gauge Component (bottom)
 * ============================================================= */
function Gauge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="text-xs text-gray-300">{label}</div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden shadow-inner">
        <motion.div
          className="h-2 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8 }}
          style={{ background: `linear-gradient(90deg, ${color}, #4ade80)` }}
        />
      </div>
    </div>
  );
}
