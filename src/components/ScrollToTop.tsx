/**
 * components/ScrollToTop.tsx
 * - 라우트 변경 시 스크롤 상단으로
 */
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop(){
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);
  return null;
}
