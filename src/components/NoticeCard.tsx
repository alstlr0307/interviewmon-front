/**
 * components/NoticeCard.tsx
 * - 공지 미리보기 카드
 */
import { Link } from "react-router-dom";
import { Notice } from "../types";

export default function NoticeCard({ notice }: { notice: Notice }){
  return (
    <Link to={`/notices/${notice.id}`} className="notice-item">
      <h3>{notice.title}</h3>
      <p>{notice.summary}</p>
      <p className="notice-date" style={{marginTop:8, fontSize:13, color:"#7f8aa2"}}>{new Date(notice.date).toLocaleDateString()}</p>
    </Link>
  );
}
