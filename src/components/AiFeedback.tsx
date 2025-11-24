import React, { useMemo } from "react";
import { motion } from "framer-motion";
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
 * 유틸리티 — 어떤 타입이 와도 배열/문자열 기준으로 정규화
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
 * Gauge
 * ============================================================= */
function Gauge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="text-xs text-gray-400">{label}</div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          className="h-1.5 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8 }}
          style={{ background: `linear-gradient(90deg, ${color}, #22d3ee)` }}
        />
      </div>
    </div>
  );
}

/* =============================================================
 * Section
 * ============================================================= */
const Section = ({
  title,
  color,
  points,
}: {
  title: string;
  color: "emerald" | "rose" | "sky";
  points: string[];
}) => {
  const bgMap = {
    emerald: "bg-gradient-to-br from-emerald-400/20 to-emerald-600/10 border-emerald-500/30",
    rose: "bg-gradient-to-br from-rose-400/20 to-rose-600/10 border-rose-500/30",
    sky: "bg-gradient-to-br from-sky-400/20 to-sky-600/10 border-sky-500/30",
  };

  if (!points || points.length === 0) return null;

  return (
    <motion.div
      className={clsx("rounded-lg p-4 border", bgMap[color])}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="font-semibold text-gray-200 mb-1">{title}</div>
      <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
        {points.map((p, i) => (
          <li key={i}>{p}</li>
        ))}
      </ul>
    </motion.div>
  );
};

/* =============================================================
 * Main Component
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

  const hasStructured =
    !!summary_interviewer ||
    !!summary_coach ||
    str.length > 0 ||
    gap.length > 0 ||
    add.length > 0 ||
    pit.length > 0 ||
    nxt.length > 0 ||
    !!polished ||
    kw.length > 0;

  /* ---------------- Radar data ---------------- */
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
      className="rounded-2xl border border-violet-600/40 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-6 space-y-8 shadow-[0_0_30px_rgba(139,92,246,0.25)]"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-xl">🤖</span>
          <span className="text-lg font-semibold bg-gradient-to-r from-violet-400 to-sky-400 bg-clip-text text-transparent">
            AI 피드백 코치
          </span>
        </div>

        {score != null && (
          <div className="px-3 py-1.5 rounded-full bg-violet-600/30 text-violet-200 text-sm font-medium">
            총점 {score}
          </div>
        )}
      </div>

      {/* Summary OR fallback feedback */}
      {hasStructured ? (
        <div className="bg-slate-800/60 border border-violet-700/30 rounded-lg p-4 space-y-3 shadow-inner">
          {summary_interviewer && (
            <div>
              <div className="font-semibold text-violet-300 mb-1">📌 면접관 요약</div>
              <p className="text-sm text-gray-300 leading-relaxed">{summary_interviewer}</p>
            </div>
          )}

          {summary_coach && (
            <div>
              <div className="font-semibold text-sky-300 mb-1">📘 코치 요약</div>
              <p className="text-sm text-gray-300 leading-relaxed">{summary_coach}</p>
            </div>
          )}
        </div>
      ) : feedback ? (
        <div className="bg-slate-800/60 border border-violet-700/30 rounded-lg p-4 shadow-inner">
          <pre className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{feedback}</pre>
        </div>
      ) : null}

      {/* Gauge */}
      <div className="grid grid-cols-3 gap-4">
        <Gauge label="STAR 완성도" value={star.score} color="#a855f7" />
        <Gauge label="특정성" value={spec.score} color="#22d3ee" />
        <Gauge label="명확성" value={spec.clarity ? 100 : 50} color="#10b981" />
      </div>

      {/* Radar */}
      <div className="w-full h-72 bg-slate-900/50 border border-slate-700 rounded-xl p-2">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
            <PolarGrid stroke="#3f3f46" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: "#a5b4fc", fontSize: 12 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
            <Radar dataKey="A" stroke="#8b5cf6" fill="url(#colorAI)" fillOpacity={0.6} />
            <defs>
              <linearGradient id="colorAI" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Keywords */}
      {kw.length > 0 && (
        <div className="bg-slate-800/60 border border-sky-700/20 rounded-lg p-4">
          <div className="font-semibold text-sky-300 mb-1">🔍 핵심 키워드</div>
          <p className="text-sm text-gray-300 leading-relaxed">{kw.join(", ")}</p>
        </div>
      )}

      {/* Polished */}
      {polished && polished.trim().length > 0 && (
        <div className="bg-slate-900/60 border border-emerald-600/20 rounded-lg p-4 shadow-inner">
          <div className="font-semibold text-emerald-300 mb-2">📝 모범답변</div>
          <pre className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
            {polished}
          </pre>
        </div>
      )}

      {/* Strengths / Gaps / Adds / Pitfalls / Next */}
      <div className="space-y-4">
        {str.length > 0 && <Section title="💪 Strengths" color="emerald" points={str} />}
        {gap.length > 0 && <Section title="🩹 개선 포인트" color="rose" points={gap} />}
        {add.length > 0 && <Section title="➕ 추가 포인트" color="sky" points={add} />}
        {pit.length > 0 && (
          <Section
            title="⚠️ 위험 요소"
            color="rose"
            points={pit.map((p) => `레벨 ${p.level ?? "?"}: ${p.text}`)}
          />
        )}
        {nxt.length > 0 && <Section title="📈 다음 단계" color="emerald" points={nxt} />}
      </div>

      {/* Follow-up */}
      {follow_up_questions && follow_up_questions.length > 0 && (
        <div className="bg-slate-800/60 border border-yellow-700/30 rounded-lg p-4 shadow-inner">
          <div className="font-semibold text-yellow-300 mb-2">🎯 예상 후속 질문</div>
          <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
            {follow_up_questions.map((q, i) => (
              <li key={i}>{typeof q === "string" ? q : q.question}</li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}
