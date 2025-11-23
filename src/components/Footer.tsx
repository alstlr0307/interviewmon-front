/**
 * components/Footer.tsx
 * - 하단 푸터
 */
export default function Footer(){
  return (
    <footer className="site">
      <div className="inner">
        <div>© {new Date().getFullYear()} 면접몬 · All rights reserved.</div>
        <div className="footer-links" style={{display:"flex",gap:12,color:"#a7b0c0"}}>
          <a href="mailto:contact@example.com">contact@example.com</a>
          <a href="/terms">이용약관</a>
          <a href="/notices">공지사항</a>
        </div>
      </div>
    </footer>
  );
}
