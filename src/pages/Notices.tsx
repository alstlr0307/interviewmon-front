// src/pages/Notices.tsx
import { useMemo, useState } from "react";
import NoticeCard from "../components/NoticeCard";
import { NOTICES as seed } from "../data/notices";

export default function Notices() {
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const filtered = seed.filter((n: any) =>
      n.title.toLowerCase().includes(q.toLowerCase()) ||
      n.summary.toLowerCase().includes(q.toLowerCase())
    );
    return filtered.sort((a: any, b: any) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  }, [q]);

  return (
    <div className="vstack" style={{ gap: 16 }}>
      <h1>공지사항</h1>
      <input
        className="input"
        placeholder="검색…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="grid2 section">
        {list.map((n: any) => (
          <NoticeCard key={n.id} notice={n} />
        ))}
      </div>
    </div>
  );
}
