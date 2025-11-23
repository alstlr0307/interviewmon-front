/**
 * pages/Login.tsx
 * - 중앙정렬 데모 로그인
 */
import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../api/mockAuth";

export default function Login(){
  const nav = useNavigate();
  const loc = useLocation() as any;
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");

  async function onSubmit(e: React.FormEvent){
    e.preventDefault();
    setErr("");
    try {
      await login(email, pw);
      nav(loc.state?.from ?? "/");
    } catch (e:any) {
      setErr(e.message || "로그인 실패");
    }
  }

  return (
    <div className="page-center">
      <div style={{width:"100%", maxWidth:480}}>
        <div className="hero-bg" style={{padding:16, marginBottom:16}}>
          <h1>로그인</h1>
          <p className="small">계정이 없으신가요? <Link to="/signup">회원가입</Link></p>
        </div>
        <form className="vstack card" style={{padding:16, gap:14}} onSubmit={onSubmit}>
          <div className="vstack">
            <label htmlFor="email">이메일</label>
            <input id="email" className="input" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div className="vstack">
            <label htmlFor="pw">비밀번호</label>
            <input id="pw" type="password" className="input" value={pw} onChange={e=>setPw(e.target.value)} placeholder="••••••••" />
          </div>
          {err && <div className="small" style={{color:"#ff9aa9"}}>{err}</div>}
          <button className="btn brand block" type="submit">로그인</button>
        </form>
        <div className="card" style={{padding:16, marginTop:12}}>
          <h3>도움말</h3>
          <ul className="small">
            <li>관리자 테스트: <b>test@admin.test</b> / 임의 비밀번호</li>
            <li>일반 로그인은 회원가입 후 이용하세요.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
