/**
 * pages/Terms.tsx
 * - 약관/개인정보 처리방침 (데모)
 */
export default function Terms(){
  return (
    <div className="vstack" style={{maxWidth:860, margin:"0 auto"}}>
      <h1>이용약관 & 개인정보 처리방침</h1>
      <div className="card" style={{padding:16}}>
        <h3>1. 서비스 개요</h3>
        <p className="small">면접몬은 모의 면접 연습을 위한 웹 서비스입니다.</p>
        <h3>2. 계정 및 보안</h3>
        <p className="small">데모 환경에서는 정보가 브라우저 로컬 스토리지에 저장됩니다.</p>
        <h3>3. 데이터 처리</h3>
        <p className="small">입력하신 답변 기록은 통계 및 훈련 목적에만 사용됩니다.</p>
        <h3>4. 책임의 한계</h3>
        <p className="small">본 데모는 학습/연구 목적이며, 실제 채용 결과에 영향을 보장하지 않습니다.</p>
      </div>
    </div>
  );
}
