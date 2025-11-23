/**
 * pages/Signup.tsx
 * - 중앙정렬 데모 회원가입 + 약관동의
 * - 수정 요점:
 *   1) mockAuth → 실제 서버 연동 useAuth("../api/auth")
 *   2) 서버 오류 메시지 안전 추출
 *   3) 중복 제출 방지(busy) 및 접근성 소소 보강
 */
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../api/auth"; // ✅ 실서버 인증 컨텍스트

export default function Signup() {
  const nav = useNavigate();
  const { signup } = useAuth();

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false); // ✅ 중복 제출 방지

  const [showTerms, setShowTerms] = useState(false);
  const [hasViewedTerms, setHasViewedTerms] = useState(false);
  const [showTermsWarning, setShowTermsWarning] = useState(false);

  // 유효성 검사 상태
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [pwError, setPwError] = useState("");

  // 이름 유효성 검사
  function validateName(value: string) {
    if (!value.trim()) {
      setNameError("이름을 입력해주세요.");
      return false;
    }
    if (/\d/.test(value)) {
      setNameError("이름에는 숫자를 사용할 수 없습니다.");
      return false;
    }
    setNameError("");
    return true;
  }

  // 이메일 유효성 검사
  function validateEmail(value: string) {
    const v = value.trim();
    // 간단한 정규식 (실서버에서도 백엔드가 2차 검증)
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    if (!ok) {
      setEmailError("올바른 이메일 주소가 아닙니다.");
      return false;
    }
    setEmailError("");
    return true;
  }

  // 비밀번호 유효성 검사
  function validatePassword(value: string) {
    if (value.length < 8) {
      setPwError("비밀번호는 8자 이상 입력해야 합니다.");
      return false;
    }
    setPwError("");
    return true;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return; // ✅ 중복 제출 방지
    setErr("");

    const isNameValid = validateName(name);
    const isEmailValid = validateEmail(email);
    const isPwValid = validatePassword(pw);
    if (!isNameValid || !isEmailValid || !isPwValid) return;

    if (!agree) {
      setErr("약관에 동의해주세요.");
      return;
    }

    setBusy(true);
    try {
      await signup(email.trim(), pw, name.trim());
      nav("/");
    } catch (e: any) {
      // ✅ 서버 메시지 우선 노출
      const msg =
        e?.response?.data?.message ??
        e?.message ??
        "회원가입 실패";
      setErr(String(msg));
    } finally {
      setBusy(false);
    }
  }

  // ESC 키로 모달 닫기
  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setShowTerms(false);
    }
    if (showTerms) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [showTerms]);

  // 전송 버튼 비활성화 판단
  const submitDisabled =
    busy ||
    !agree ||
    !name.trim() ||
    !email.trim() ||
    !pw ||
    !!nameError ||
    !!emailError ||
    !!pwError;

  return (
    <div className="page-center">
      <div style={{ width: "100%", maxWidth: 560 }}>
        <div className="hero-bg" style={{ padding: 16, marginBottom: 16 }}>
          <h1>회원가입</h1>
          <p className="small">
            이미 계정이 있으신가요? <Link to="/login">로그인</Link>
          </p>
        </div>

        <form className="vstack card" style={{ padding: 16, gap: 14 }} onSubmit={onSubmit} noValidate>
          <div className="vstack">
            <label htmlFor="name">이름</label>
            <input
              id="name"
              className="input"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) validateName(e.target.value);
              }}
              onBlur={(e) => validateName(e.target.value)}
              placeholder="홍길동"
              aria-invalid={!!nameError}
              autoComplete="name"
              autoFocus
            />
            {nameError && <div className="small" style={{ color: "#ff9aa9" }}>{nameError}</div>}
          </div>

          <div className="vstack">
            <label htmlFor="email">이메일</label>
            <input
              id="email"
              className="input"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) validateEmail(e.target.value);
              }}
              onBlur={(e) => validateEmail(e.target.value)}
              placeholder="you@example.com"
              aria-invalid={!!emailError}
              autoComplete="email"
              inputMode="email"
            />
            {emailError && <div className="small" style={{ color: "#ff9aa9" }}>{emailError}</div>}
          </div>

          <div className="vstack">
            <label htmlFor="pw">비밀번호</label>
            <input
              id="pw"
              type="password"
              className="input"
              value={pw}
              onChange={(e) => {
                setPw(e.target.value);
                if (pwError) validatePassword(e.target.value);
              }}
              onBlur={(e) => validatePassword(e.target.value)}
              placeholder="8자 이상 입력"
              aria-invalid={!!pwError}
              autoComplete="new-password"
            />
            {pwError && <div className="small" style={{ color: "#ff9aa9" }}>{pwError}</div>}
          </div>

          <div className="hstack" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <label className="hstack" title={!hasViewedTerms ? "먼저 약관을 확인해주세요" : undefined}>
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => {
                  if (!hasViewedTerms) {
                    setShowTermsWarning(true);
                    return;
                  }
                  setAgree(e.target.checked);
                  setShowTermsWarning(false);
                }}
                // 디자인은 유지하되 안내 강화
                style={{ opacity: hasViewedTerms ? 1 : 0.5, cursor: "pointer" }}
              />
              <span className="small">이용약관 및 개인정보 처리방침에 동의합니다.</span>
            </label>
            <span
              onClick={() => setShowTerms(true)}
              style={{
                color: "#7c3aed",
                cursor: "pointer",
                textDecoration: "underline",
                fontSize: "14px",
              }}
            >
              보기
            </span>
          </div>

          {showTermsWarning && (
            <div className="small" style={{ color: "#ff9aa9", marginTop: "4px" }}>
              약관을 먼저 확인해주세요.
            </div>
          )}

          {err && <div className="small" style={{ color: "#ff9aa9" }}>{err}</div>}

          <button className="btn brand block" type="submit" disabled={submitDisabled}>
            {busy ? "가입 중…" : "가입하기"}
          </button>
        </form>

        <div className="card" style={{ padding: 16, marginTop: 12 }}>
          <h3>가입 안내</h3>
          <ul className="small">
            <li>데모 환경에서는 로컬 스토리지만 사용됩니다.</li>
            <li>실서비스에서는 비밀번호가 안전하게 해시(bcrypt) 저장됩니다.</li>
          </ul>
        </div>
      </div>

      {/* 약관 모달 */}
      {showTerms && (
        <div
          className="modal show"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowTerms(false)}
        >
          <div
            className="card"
            style={{
              maxWidth: "600px",
              width: "90%",
              maxHeight: "80vh",
              overflow: "auto",
              margin: "20px",
              padding: "24px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ marginBottom: "20px" }}>
              <h3>이용약관 & 개인정보 처리방침</h3>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <h3>1. 서비스 개요</h3>
              <p className="small" style={{ marginBottom: "16px" }}>
                면접몬은 모의 면접 연습을 위한 웹 서비스입니다.
              </p>

              <h3>2. 계정 및 보안</h3>
              <p className="small" style={{ marginBottom: "16px" }}>
                데모 환경에서는 정보가 브라우저 로컬 스토리지에 저장됩니다.
              </p>

              <h3>3. 데이터 처리</h3>
              <p className="small" style={{ marginBottom: "16px" }}>
                입력하신 답변 기록은 통계 및 훈련 목적에만 사용됩니다.
              </p>

              <h3>4. 책임의 한계</h3>
              <p className="small" style={{ marginBottom: "20px" }}>
                본 데모는 학습/연구 목적이며, 실제 채용 결과에 영향을 보장하지 않습니다.
              </p>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                className="btn brand"
                onClick={() => {
                  setShowTerms(false);
                  setHasViewedTerms(true);
                }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
