/**
 * pages/Home.tsx
 * - 홈 랜딩: 히어로/작동방식/특징/공지/리뷰/FAQ
 */
import { Link, useNavigate } from "react-router-dom";
import Section from "../components/Section";
import { NOTICES } from "../data/notices"; // ✅ export 이름 정정
import NoticeCard from "../components/NoticeCard";
import { useAuth } from "../api/mockAuth";

const notices = NOTICES; // ✅ 기존 코드 유지용 alias

export default function Home(){
  const { user } = useAuth();
  const nav = useNavigate();

  const goStart = () => {
    if (!user) {
      nav("/login", { state: { from: "/companies" } });
    } else {
      nav("/companies");
    }
  };

  return (
    <div className="vstack" style={{gap:32}}>

      {/* 히어로 */}
      <div className="hero reveal is-visible">
        <div>
          <h1>AI 타임어택 모의면접<br/>면접몬으로 실전 감각을</h1>
          <p>기업 선택 → 제한시간 답변 → 결과 요약. 간단하지만 강력한 루틴으로 준비하세요.</p>
          <div className="hstack" style={{gap:12, flexWrap:"wrap"}}>
            <button onClick={goStart} className="btn brand icon">🚀 지금 시작</button>
            <Link to="/notices" className="btn ghost">공지사항</Link>
          </div>
          <div className="hstack" style={{gap:12, marginTop:12}}>
            <span className="badge">⏱ 30/60초 타임어택</span>
            <span className="badge">🎤 음성 모드</span>
            <span className="badge">🧭 난이도/문항수 설정</span>
          </div>
        </div>
        <div className="panel">
          <div className="vstack" style={{gap:12}}>
            <div className="kpi"><b>12,000+</b><span>연습 세션(데모)</span></div>
            <div className="kpi"><b>18%</b><span>시간초과 감소</span></div>
            <div className="kpi"><b>3x</b><span>응답 구조화 향상</span></div>
          </div>
        </div>
      </div>

      {/* 이하 동일: 작동방식/특징/공지/리뷰/FAQ */}
      <Section>
        <h2>어떻게 작동하나요</h2>
        <div className="grid4 section">
          <div className="card" style={{padding:16}}>
            <h3>1. 기업 선택</h3>
            <p className="small">대상 기업을 고르면 해당 질문 세트가 준비됩니다.</p>
          </div>
          <div className="card" style={{padding:16}}>
            <h3>2. 옵션 설정</h3>
            <p className="small">문항수/난이도를 정하고 바로 시작!</p>
          </div>
          <div className="card" style={{padding:16}}>
            <h3>3. 타임어택</h3>
            <p className="small">간단 30초·어려움 60초. 종료 시 자동 다음.</p>
          </div>
          <div className="card" style={{padding:16}}>
            <h3>4. 결과 요약</h3>
            <p className="small">제출/시간초과/소요시간을 한눈에.</p>
          </div>
        </div>
      </Section>

      <Section>
        <h2>왜 면접몬인가요</h2>
        <div className="grid3 section">
          <div className="card" style={{padding:16}}>
            <h3>기업별 질문 50+</h3>
            <p className="small">삼성·애플·엔비디아·인텔·AMD·넥슨. 각 50문항, 매회 10개 랜덤.</p>
          </div>
          <div className="card" style={{padding:16}}>
            <h3>지원동기 필수</h3>
            <p className="small">초반에 ‘지원동기’ 계열 질문이 우선 등장합니다.</p>
          </div>
          <div className="card" style={{padding:16}}>
            <h3>음성 모드 & 포커스</h3>
            <p className="small">TTS/STT로 실전처럼. 인터뷰 중 헤더/푸터 자동 숨김.</p>
          </div>
        </div>
      </Section>

      <Section>
        <div className="vstack section">
          <div className="hstack" style={{justifyContent:"space-between"}}>
            <h2>공지사항</h2>
            <Link to="/notices" className="btn ghost">전체 보기</Link>
          </div>
          <div className="grid2">
            {notices.slice(0,2).map((n: any) => <NoticeCard key={n.id} notice={n} />)}
          </div>
        </div>
      </Section>

      <Section>
        <h2>이용자 후기</h2>
        <div className="grid3 section">
          <div className="card" style={{padding:16}}>
            <h3>실전 감각이 살아나요</h3>
            <p className="small">제한시간 내 핵심을 말하는 연습이 큰 도움. 스터디원과 JSON으로 기록도 공유했습니다.</p>
            <p className="small">— 가상의 사용자 A</p>
          </div>
          <div className="card" style={{padding:16}}>
            <h3>지원동기 대비에 딱</h3>
            <p className="small">초반에 동기 질문이 나와서 본론으로 바로 들어갈 수 있어요.</p>
            <p className="small">— 가상의 사용자 B</p>
          </div>
          <div className="card" style={{padding:16}}>
            <h3>가볍고 빠른 도구</h3>
            <p className="small">로그인 없이도 체험해보고, 나중에 연동해 기록을 남길 수 있네요.</p>
            <p className="small">— 가상의 사용자 C</p>
          </div>
        </div>
      </Section>

      <Section>
        <h2>자주 묻는 질문</h2>
        <div className="grid2 section">
          <details className="faq-item">
            <summary>회원가입 없이도 사용 가능한가요?</summary>
            <div className="section small">네. 다만 기록 저장/복구, 마이페이지 기능은 로그인 후 제공됩니다.</div>
          </details>
          <details className="faq-item">
            <summary>음성 모드는 어떤 브라우저에서 지원하나요?</summary>
            <div className="section small">크롬 기반 브라우저에서 우선 지원됩니다. 미지원 시 텍스트 입력으로 자동 전환됩니다.</div>
          </details>
          <details className="faq-item">
            <summary>질문은 어디서 오나요?</summary>
            <div className="section small">회사별 50문항의 샘플 뱅크를 제공하며, 관리자 화면에서 직접 추가/수정 가능합니다.</div>
          </details>
          <details className="faq-item">
            <summary>결과를 외부에 공유할 수 있나요?</summary>
            <div className="section small">JSON 내보내기 기능을 제공합니다. 추후 공유 링크/리포트 PDF도 추가 예정입니다.</div>
          </details>
        </div>
      </Section>

    </div>
  );
}
