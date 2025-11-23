import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

type Props = {
  feedback: string;
  score?: number | null;
  answer?: string | null;
  question?: string | null;
};

/* -------------------------------
 * 분석 유틸
 * ----------------------------- */
function safeJsonParse(text: string): any | null {
  try {
    const match = /```json([\s\S]*?)```/i.exec(text);
    if (match?.[1]) return JSON.parse(match[1]);
  } catch {}
  try {
    return JSON.parse(text);
  } catch {}
  return null;
}
function analyzeSTAR(answer?: string | null) {
  const a = (answer || "");
  const has = (regex: RegExp) => regex.test(a);
  const S = has(/상황|배경|환경/);
  const T = has(/과제|문제|목표/);
  const A = has(/행동|실행|시도|조치/);
  const R = has(/결과|성과|지표|효과/);
  return { S, T, A, R, score: [S, T, A, R].filter(Boolean).length * 25 };
}
function analyzeSpecificity(answer?: string | null) {
  const a = (answer || "");
  const metrics = (a.match(/\d+|%|ms|분|시간|지표/gi) || []).length;
  const detail = /(trade|가설|원인|비교|효율)/i.test(a);
  const clarity = /(명확|구체|정량)/.test(a);
  return { metrics, detail, clarity, score: Math.min(100, metrics * 15 + (detail ? 25 : 0) + (clarity ? 20 : 0)) };
}

/* -------------------------------
 * 게이지 바
 * ----------------------------- */
function Gauge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="text-xs text-gray-400">{label}</div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          className="h-1.5 rounded-full"
          style={{
            background: `linear-gradient(90deg,${color},#22d3ee)`,
            width: `${value}%`,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1 }}
        />
      </div>
    </div>
  );
}

/* -------------------------------
 * 메인 컴포넌트
 * ----------------------------- */
export default function AiFeedback({ feedback, score, answer, question }: Props) {
  const star = useMemo(() => analyzeSTAR(answer), [answer]);
  const spec = useMemo(() => analyzeSpecificity(answer), [answer]);

  const radarData = [
    { subject: "상황", A: star.S ? 100 : 50, fullMark: 100 },
    { subject: "과제", A: star.T ? 100 : 50, fullMark: 100 },
    { subject: "행동", A: star.A ? 100 : 50, fullMark: 100 },
    { subject: "결과", A: star.R ? 100 : 50, fullMark: 100 },
    { subject: "특정성", A: spec.score, fullMark: 100 },
  ];

  return (
    <motion.div
      className="relative overflow-hidden rounded-2xl border border-violet-600/40 bg-gradient-to-b from-slate-900/90 to-slate-950/90 backdrop-blur-md p-6 shadow-[0_0_30px_rgba(139,92,246,0.25)] space-y-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-xl">🤖</span>
          <span className="text-lg font-semibold bg-gradient-to-r from-violet-400 to-sky-400 bg-clip-text text-transparent">
            AI 피드백 코치
          </span>
        </div>
        {score !== undefined && (
          <div className="px-3 py-1.5 rounded-full bg-violet-600/30 text-violet-200 text-sm font-medium">
            총점 {score}
          </div>
        )}
      </div>

      {/* 게이지 바 */}
      <div className="grid grid-cols-3 gap-4">
        <Gauge label="STAR 완성도" value={star.score} color="#a855f7" />
        <Gauge label="특정성" value={spec.score} color="#22d3ee" />
        <Gauge label="표현 명확성" value={spec.clarity ? 100 : 60} color="#10b981" />
      </div>

      {/* 요약 */}
      <div className="bg-slate-800/60 border border-violet-700/30 rounded-lg p-4 shadow-inner">
        <div className="font-semibold text-violet-300 mb-1">📌 핵심 요약</div>
        <p className="text-sm text-gray-300 leading-relaxed">
          핵심 스토리의 구조가 약합니다. STAR 프레임을 통해{" "}
          <span className="text-sky-400 font-medium">상황-과제-행동-결과</span> 순으로
          재정리하고, 구체적인 수치와 지표를 통해{" "}
          <span className="text-emerald-400 font-medium">결과의 명확성</span>을 보강하세요.
        </p>
      </div>

      {/* 시각 차트 */}
      <div className="w-full h-60 bg-slate-900/50 border border-slate-700 rounded-xl p-2">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
            <PolarGrid stroke="#3f3f46" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: "#a5b4fc", fontSize: 12 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
            <Radar
              name="피드백 분석"
              dataKey="A"
              stroke="#8b5cf6"
              fill="url(#colorAI)"
              fillOpacity={0.6}
            />
            <defs>
              <linearGradient id="colorAI" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* 세부 피드백 */}
      <div className="space-y-3">
        <Section
          title="💪 잘한 점 (Strengths)"
          color="emerald"
          points={[
            "핵심 주제를 명확히 전달하고, 구조적으로 서술하였습니다.",
            "직무와 연관된 키워드를 사용하여 전문성을 확보했습니다.",
            "전체 맥락이 논리적으로 연결되어 있습니다.",
          ]}
        />
        <Section
          title="🩹 보완할 점 (Improvements)"
          color="rose"
          points={[
            "구체적인 수치·지표를 통해 객관성을 강화하세요.",
            "문장 내에서 ‘결과’ 부분의 임팩트를 높이세요.",
            "행동 단계를 더 구체적으로 풀어내세요.",
          ]}
        />
        <Section
          title="💡 제안 / 다음 단계"
          color="sky"
          points={[
            "STAR 각 단계별 키워드를 1문장으로 명확히 기술해보세요.",
            "‘결과’ 파트를 정량화한 후 ‘배운 점’을 한 줄로 마무리하면 완성됩니다.",
          ]}
        />
      </div>
    </motion.div>
  );
}

/* -------------------------------
 * 세부 섹션
 * ----------------------------- */
const Section = ({
  title,
  color,
  points,
}: {
  title: string;
  color: "emerald" | "rose" | "sky";
  points: string[];
}) => {
  const colorMap: Record<string, string> = {
    emerald: "from-emerald-400/20 to-emerald-600/10",
    rose: "from-rose-400/20 to-rose-600/10",
    sky: "from-sky-400/20 to-sky-600/10",
  };
  return (
    <motion.div
      className={`rounded-lg border border-${color}-500/30 bg-gradient-to-br ${colorMap[color]} p-4`}
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
