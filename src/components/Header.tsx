/**
 * components/Header.tsx
 * - 스크롤 다운 시 숨김, 업 시 표시
 */
import { Link, useLocation } from "react-router-dom";
import useScrollDirection from "../hooks/useScrollDirection";
import { useAuth } from "../api/mockAuth";

export default function Header(){
  const { pathname } = useLocation();
  const dir = useScrollDirection();
  const { user, logout } = useAuth();

  return (
    <header className={`site ${dir === "down" ? "hide" : ""}`}>
      <div className="inner">
        <Link to="/" className="brand" aria-label="면접몬 홈">
          <img src={`${process.env.PUBLIC_URL}/Imon.png`} alt="면접몬 로고" style={{width: '48px', height: '48px'}} />
          <span style={{fontSize:22}}>면접몬</span>
        </Link>
        <nav className="hstack" style={{marginLeft:8}}>
          <Link to="/" aria-current={pathname==="/" ? "page" : undefined}>홈</Link>
          <Link to="/companies" aria-current={pathname==="/companies" ? "page" : undefined}>기업선택</Link>
          <Link to="/notices" aria-current={pathname.startsWith("/notices") ? "page" : undefined}>공지사항</Link>
        </nav>
        <div className="header-cta">
          {!user ? (
            <>
              <Link to="/login" className="btn light">로그인</Link>
              <Link to="/signup" className="btn brand">회원가입</Link>
            </>
          ) : (
            <>
              <Link to="/mypage" className="badge user-profile" style={{cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px'}}>
                <img src={`${process.env.PUBLIC_URL}/profile.png`} alt="프로필" style={{width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#ffffff', padding: '4px'}} />
                {user.name}
              </Link>
              <button className="btn brand" onClick={logout}>로그아웃</button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
