/**
 * App.tsx
 * - 전역 라우팅 + 공통 레이아웃(Header/Footer/ThemeProvider)
 * - BrowserRouter는 여기 ‘한 곳’만 사용
 * - 인터뷰 경로는 반드시 :company 파라미터 사용
 */
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Companies from "./pages/Companies";
import Interview from "./pages/Interview";
import Result from "./pages/Result";
import Notices from "./pages/Notices";
import NoticeDetail from "./pages/NoticeDetail";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Terms from "./pages/Terms";
import MyPage from "./pages/MyPage";
import AdminQuestions from "./pages/AdminQuestions";
import Header from "./components/Header";
import Footer from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";
import ProtectedRoute from "./components/ProtectedRoute";
import { ThemeProvider } from "./contexts/ThemeContext";

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Header />

        <div className="container">
          <Routes>
            {/* 공개 페이지 */}
            <Route path="/" element={<Home />} />
            <Route path="/notices" element={<Notices />} />
            <Route path="/notices/:id" element={<NoticeDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/result" element={<Result />} />

            {/* 보호 페이지 (로그인 필요) */}
            <Route
              path="/companies"
              element={
                <ProtectedRoute>
                  <Companies />
                </ProtectedRoute>
              }
            />
            <Route
              path="/interview/:company"
              element={
                <ProtectedRoute>
                  <Interview />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mypage"
              element={
                <ProtectedRoute>
                  <MyPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/questions"
              element={
                <ProtectedRoute adminOnly>
                  <AdminQuestions />
                </ProtectedRoute>
              }
            />

            {/* 나머지는 홈으로 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>

        <Footer />
      </BrowserRouter>
    </ThemeProvider>
  );
}
