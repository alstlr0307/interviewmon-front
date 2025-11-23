/**
 * components/Radar.tsx
 * - 외부 라이브러리 없이 SVG로 그리는 레이더 차트
 */
import React from "react";

export type RadarDatum = { label: string; value: number };

export default function Radar({
  data,
  size = 280,
  levels = 4,
  stroke = "#3b82f6",
  fill = "rgba(59,130,246,.25)",
}: {
  data: RadarDatum[];
  size?: number;
  levels?: number;
  stroke?: string;
  fill?: string;
}) {
  const N = Math.max(3, data.length);
  const cx = size / 2;
  const cy = size / 2;
  const r = (size / 2) * 0.85;

  function point(i: number, v: number) {
    const angle = (-Math.PI / 2) + (2 * Math.PI * i) / N; // 위에서 시작, 시계방향
    const rr = r * (Math.max(0, Math.min(100, v)) / 100);
    const x = cx + rr * Math.cos(angle);
    const y = cy + rr * Math.sin(angle);
    return [x, y] as const;
  }

  const gridPolys = Array.from({ length: levels }, (_, li) => {
    const ratio = (li + 1) / levels;
    const pts = data.map((_, i) => {
      const [x, y] = point(i, ratio * 100);
      return `${x},${y}`;
    });
    return <polygon key={li} points={pts.join(" ")} fill="none" stroke="#1f2a44" strokeWidth={1} />;
  });

  const axes = data.map((d, i) => {
    const [x, y] = point(i, 100);
    const [tx, ty] = point(i, 110);
    return (
      <g key={i}>
        <line x1={cx} y1={cy} x2={x} y2={y} stroke="#1f2a44" strokeWidth={1} />
        <text x={tx} y={ty} fill="#9aa3b2" fontSize="12" textAnchor="middle" dominantBaseline="middle">
          {d.label}
        </text>
      </g>
    );
  });

  const valuePts = data.map((d, i) => {
    const [x, y] = point(i, d.value);
    return `${x},${y}`;
  });

  return (
    <svg width={size} height={size} role="img" aria-label="토픽 레이더 차트">
      <g>
        {gridPolys}
        {axes}
        <polygon points={valuePts.join(" ")} fill={fill} stroke={stroke} strokeWidth={2} />
        <circle cx={cx} cy={cy} r={2} fill={stroke} />
      </g>
    </svg>
  );
}
