// src/components/AiFeedback.tsx
// Interviewmon — 공격형 면접 피드백 UI 최신 버전 (v3.1)

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
 * Types
 * ============================================================= */
export type FollowUpItem =
  | string
  | {
      question: string;
      reason?: string;
    };

type PitItem = { text: string; level: number | null };

type Props = {
  score?: number | null;
  feedback?: string | null;

  answer?: string | null;
  question?: string | null;

  summary_interviewer?: string | null;
  summary_coach?: string | null;

  strengths?: string[] | null;
  gaps?: string[] | null;
  adds?: string[] | null;

  pitfalls?: PitItem[] | null;
  next?: string[] | null;

  polished?: string | null;
  keywords?: string[] | null;
  category?: string | null;

  chart?: Record<string, number | string> | null;

  follow_up_questions?: FollowUpItem[] | null;
};

/* =============================================================
 * Normalizers — 모든 타입을 프론트에서 안전하게 보정
 * ============================================================= */
const normalizeList = (arr?: any[] | null): string[] => {
  if (!arr) return [];
  return arr
    .map((v) => {
      if (typeof v === "string") return v.trim();
      if (v && typeof v.text === "string") return v.text.trim();
      return "";
    })
    .filter(Boolean);
};

const normalizePitfalls = (arr?: PitItem[] | null): PitItem[] => {
  if (!arr) return [];
  return arr
    .map((v) => {
      if (!v) return null;
      if (typeof v === "string") return { text: v, level: null };

      const text = typeof v.text === "string" ? v.text.trim() : "";
      const level =
        typeof v.level === "number" && Number.isFinite(v.level)
          ? v.level
          : null;

      return text ? { text, level } : null;
    })
    .filter(Boolean) as PitItem[];
};

const normalizeFollowUps = (arr?: FollowUpItem[] | null) => {
  if (!arr) return [];

  return arr.map((v) => {
    if (!v) return { question: "", reason: "" };

    if (typeof v === "string") return { question: v, reason: "" };

    return {
      question: typeof v.question === "string" ? v.question.trim() : "",
      reason: typeof v.reason === "string" ? v.reason.trim() : "",
    };
  });
};

const normalizeChart = (
  chart?: Record<string, number | string> | null
) => {
  if (!chart) return {};

  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(chart)) {
    const num = typeof v === "string" ? Number(v) : v;
    out[k] = Number.isFinite(num) ? num : 0;
  }
  return out;
};

/* =============================================================
 * STAR 분석 / Specificity 분석
 * ============================================================= */
function analyzeSTAR(a?: string | null) {
  const text = a || "";
  const s = /상황|배경|환경|컨텍스트/i.test(text);
  const t = /문제|과제|목표|도전/i.test(text);
  const act = /행동|실행|시도|조치/i.test(text);
  const r = /결과|성과|지표|효과|재발방지/i.test(text);
  return {
    S: s,
    T: t,
    A: act,
    R: r,
    score: [s, t, act, r].filter(Boolean).length * 25,
  };
}

function analyzeSpecificity(a?: string | null) {
  const text = a || "";
  const metrics = (text.match(/\d+|%|ms|분|시간|지표|데이터/gi) || []).length;
  const detail = /(trade|가설|원인|비교|효율|분석)/i.test(text);
  const clarity = /(구체|정량|명확)/i.test(text);
  return {
    metrics,
    detail,
    clarity,
    score: Math.min(
      100,
      metrics * 15 + (detail ? 25 : 0) + (clarity ? 20 : 0)
    ),
  };
}

/* =============================================================
 * CardSection
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
}) => (
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

/* =============================================================
 * Accordion — Follow-up 질문
 * ============================================================= */
const Accordion = ({ q }: { q: { question: string; reason?: string } }) => {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex justify-between items-center py-2 text-left text-gray-200 hover:text-white"
      >
        <span>• {q.question}</span>
        <span>{open ? "▲" : "▼"}</span>
      </button>

      <AnimatePresence>
        {open && q.reason && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="pl-4 text-sm text-gray-400"
          >
            {q.reason}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* =============================================================
 * Main Component
 * ============================================================= */
export default function AiFeedback(props: Props) {
  const {
    score,
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
    answer,
  } = props;

  const star = useMemo(() => analyzeSTAR(answer), [answer]);
  const spec = useMemo(() => analyzeSpecificity(answer), [answer]);

  const str = normalizeList(strengths);
  const gap = normalizeList(gaps);
  const add = normalizeList(adds);
  const pit = normalizePitfalls(pitfalls);
  const nxt = normalizeList(next);
  const kw = normalizeList(keywords);

  const safeChart = normalizeChart(chart);
  const fups = normalizeFollowUps(follow_up_questions);

  // Radar fallback (STAR + Specificity)
  const radarData =
    Object.keys(safeChart).length > 0
      ? Object.entries(safeChart).map(([k, v]) => ({
          subject:
            {
              structure: "구조",
              specificity: "정확성",
              logic: "논리성",
              tech_depth: "기술 깊이",
              risk: "리스크 인식",
            }[k] || k,
          A: v,
          fullMark: 100,
        }))
      : [
          { subject: "상황", A: star.S ? 100 : 40, fullMark: 100 },
          { subject: "과제", A: star.T ? 100 : 40, fullMark: 100 },
          { subject: "행동", A: star.A ? 100 : 40, fullMark: 100 },
          { subject: "결과", A: star.R ? 100 : 40, fullMark: 100 },
          { subject: "정확성", A: spec.score, fullMark: 100 },
        ];

  return (
    <motion.div
      className="rounded-2xl border border-violet-600/40 bg-gradient-to-b from-[#0c0c20] to-[#0c0f29] p-8 space-y-10 shadow-[0_0_50px_rgba(139,92,246,0.2)]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
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

      {(summary_interviewer || summary_coach) && (
        <CardSection
          icon="📌"
          title="핵심 요약"
          color="border-violet-500/40 bg-violet-800/10"
        >
          {summary_interviewer && (
            <p className="text-gray-300 whitespace-pre-line">
              {summary_interviewer}
            </p>
          )}
          {summary_coach && (
            <p className="text-gray-300 whitespace-pre-line">
              {summary_coach}
            </p>
          )}
        </CardSection>
      )}

      {/* Radar */}
      <CardSection
        icon="📊"
        title="구조 분석"
        color="border-slate-700 bg-slate-900/40"
      >
        <div className="w-full h-80 rounded-xl p-2">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart
              cx="50%"
              cy="50%"
              outerRadius="80%"
              data={radarData}
            >
              <PolarGrid stroke="#3f3f46" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: "#c7d2fe", fontSize: 12 }}
              />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
              <Radar
                dataKey="A"
                stroke="#8b5cf6"
                fill="#8b5cf6"
                fillOpacity={0.45}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </CardSection>

      {/* Keywords */}
      {kw.length > 0 && (
        <CardSection
          icon="🔍"
          title="핵심 키워드"
          color="border-sky-500/40 bg-sky-800/10"
        >
          <p className="text-gray-300 text-sm">{kw.join(", ")}</p>
        </CardSection>
      )}

      {/* Polished */}
      {polished && (
        <CardSection
          icon="📝"
          title="모범 답변"
          color="border-emerald-500/40 bg-emerald-800/10"
        >
          <pre className="text-gray-200 whitespace-pre-wrap">
            {polished}
          </pre>
        </CardSection>
      )}

      {/* Strengths */}
      {str.length > 0 && (
        <CardSection
          icon="💪"
          title="강점"
          color="border-emerald-500/40 bg-emerald-700/10"
        >
          <ul className="space-y-2 text-gray-300">
            {str.map((s, i) => (
              <li key={i}>• {s}</li>
            ))}
          </ul>
        </CardSection>
      )}

      {/* Gaps */}
      {gap.length > 0 && (
        <CardSection
          icon="🩹"
          title="개선 포인트"
          color="border-rose-500/40 bg-rose-700/10"
        >
          <ul className="space-y-2 text-gray-300">
            {gap.map((s, i) => (
              <li key={i}>• {s}</li>
            ))}
          </ul>
        </CardSection>
      )}

      {/* Pitfalls */}
      {pit.length > 0 && (
        <CardSection
          icon="⚠️"
          title="위험 요소"
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

      {/* Next Steps */}
      {nxt.length > 0 && (
        <CardSection
          icon="📈"
          title="다음 단계"
          color="border-indigo-500/40 bg-indigo-700/10"
        >
          <ul className="space-y-2 text-gray-300">
            {nxt.map((s, i) => (
              <li key={i}>• {s}</li>
            ))}
          </ul>
        </CardSection>
      )}

      {/* Follow-up */}
      {fups.length > 0 && (
        <CardSection
          icon="🎯"
          title="예상 후속 질문"
          color="border-yellow-500/40 bg-yellow-700/10"
        >
          <div className="space-y-2">
            {fups.map((q, i) => (
              <Accordion key={i} q={q} />
            ))}
          </div>
        </CardSection>
      )}
    </motion.div>
  );
}
