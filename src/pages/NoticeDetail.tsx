// src/pages/NoticeDetail.tsx
/**
 * 공지 상세
 */
import { useParams, useNavigate, Link } from "react-router-dom";
import { NOTICES } from "../data/notices";

function mdToHtml(md: string) {
  // 아주 단순한 마크다운 변환(굵게/줄바꿈)
  const esc = (s: string) =>
    s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
  return esc(md).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br/>");
}

export default function NoticeDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();

  const notices = NOTICES;
  const notice = notices.find((n: any) => n.id === id) as any;

  if (!notice) {
    return (
      <div className="vstack">
        <div className="card" style={{ padding: 16 }}>
          존재하지 않는 공지입니다. <button className="btn" onClick={() => nav(-1)}>뒤로</button>
        </div>
      </div>
    );
  }

  // ✅ 다양한 키 중 존재하는 것 사용
  const body: string =
    (notice.body as string) ??
    (notice.content as string) ??
    (notice.markdown as string) ??
    (notice.html as string) ??
    (notice.summary as string) ??
    "";

  return (
    <div className="vstack" style={{ gap: 16 }}>
      <div className="hstack" style={{ justifyContent: "space-between" }}>
        <h1>{notice.title}</h1>
        <Link className="btn" to="/notices">목록</Link>
      </div>
      <div className="card" style={{ padding: 16 }}>
        <div dangerouslySetInnerHTML={{ __html: mdToHtml(body) }} />
      </div>
    </div>
  );
}
