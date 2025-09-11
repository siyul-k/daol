// ✅ 파일 경로: src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { IdleTimerProvider } from "react-idle-timer";   // ✅ 추가

// ─ 관리자 레이아웃 ─
import AdminLayout from "./components/AdminLayout";
import AdminProtectedRoute from "./components/AdminProtectedRoute";

// ─ 사용자 레이아웃 ─
import UserLayout from "./components/UserLayout";

// ─ 관리자 페이지 ─
import AdminLogin from "./pages/AdminLogin";
import AdminMembersPage from "./pages/AdminMembersPage";
import AdminTreePage from "./pages/AdminTreePage";
import AdminTreeSponsorPage from "./pages/AdminTreeSponsorPage";
import AdminDepositPage from "./pages/AdminDepositPage";
import AdminWithdrawPage from "./pages/AdminWithdrawPage";
import PointAdjustPage from "./pages/PointAdjustPage";
import AdminNoticesPage from "./pages/AdminNoticesPage";
import AdminCodeGivePage from "./pages/AdminCodeGivePage";
import AdminProductsPage from "./pages/AdminProductsPage";
import AdminRewardsPage from "./pages/AdminRewardsPage";
import AdminCentersPage from "./pages/AdminCentersPage";
import AdminSettingsPage from "./pages/AdminSettingsPage";
import AdminAdminsPage from "./pages/AdminAdminsPage";

// ─ 회원 페이지 ─
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import DashboardPage from "./pages/DashboardPage";
import SettingsPage from "./pages/SettingsPage";
import PointPage from "./pages/PointPage";
import PointSummaryPage from "./pages/PointSummaryPage";
import DepositPage from "./pages/DepositPage";
import DepositHistoryPage from "./pages/DepositHistoryPage";
import WithdrawPage from "./pages/WithdrawPage";
import WithdrawHistoryPage from "./pages/WithdrawHistoryPage";
import NoticePage from "./pages/NoticePage";
import ProductPage from "./pages/ProductPage";
import ProductHistoryPage from "./pages/ProductHistoryPage";
import RecommendTreePage from "./pages/RecommendTreePage";
import SponsorTreePage from "./pages/SponsorTreePage";

// ─ 로그인 훅 ─
import { useAuth } from "./hooks/useAuth";

// ─ 테마 컨텍스트 ─
import { ThemeProvider } from "@/contexts/ThemeContext";

export default function App() {
  const { user } = useAuth();
  const is_admin = user?.is_admin;

  // ✅ Idle 상태일 때 자동 로그아웃 처리
  const handleIdle = () => {
    if (is_admin) {
      localStorage.removeItem("admin");
      alert("6시간 동안 활동이 없어 로그아웃되었습니다.");
      window.location.replace("/ad-da/login");
    } else {
      localStorage.removeItem("user");
      alert("15분 동안 활동이 없어 로그아웃되었습니다.");
      window.location.replace("/login");
    }
  };

  // ✅ Idle 타임아웃 (회원 15분, 관리자 6시간)
  const timeout = is_admin
    ? 1000 * 60 * 60 * 6   // 관리자: 6시간
    : 1000 * 60 * 15;      // 회원: 15분

  return (
    <Router>
      <IdleTimerProvider
        key={timeout}     // 사용자 전환 시 재마운트 보장
        timeout={timeout}
        onIdle={handleIdle}
        debounce={500}
        crossTab           // 여러 탭 동기화
      >
        <Routes>
          {/* ─────────────── 회원 라우팅 (ThemeProvider 적용) ─────────────── */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          <Route
            path="/dashboard"
            element={
              <ThemeProvider>
                <UserLayout>
                  <DashboardPage />
                </UserLayout>
              </ThemeProvider>
            }
          />
          <Route
            path="/point"
            element={
              <ThemeProvider>
                <UserLayout>
                  <PointPage />
                </UserLayout>
              </ThemeProvider>
            }
          />
          <Route
            path="/point/summary"
            element={
              <ThemeProvider>
                <UserLayout>
                  <PointSummaryPage />
                </UserLayout>
              </ThemeProvider>
            }
          />
          <Route
            path="/settings"
            element={
              <ThemeProvider>
                <UserLayout>
                  <SettingsPage />
                </UserLayout>
              </ThemeProvider>
            }
          />
          <Route
            path="/tree/recommend"
            element={
              <ThemeProvider>
                <UserLayout>
                  <RecommendTreePage />
                </UserLayout>
              </ThemeProvider>
            }
          />
          <Route
            path="/tree/sponsor"
            element={
              <ThemeProvider>
                <UserLayout>
                  <SponsorTreePage />
                </UserLayout>
              </ThemeProvider>
            }
          />
          <Route
            path="/deposit"
            element={
              <ThemeProvider>
                <UserLayout>
                  <DepositPage />
                </UserLayout>
              </ThemeProvider>
            }
          />
          <Route
            path="/deposit-history"
            element={
              <ThemeProvider>
                <UserLayout>
                  <DepositHistoryPage />
                </UserLayout>
              </ThemeProvider>
            }
          />
          <Route
            path="/withdraw"
            element={
              <ThemeProvider>
                <UserLayout>
                  <WithdrawPage />
                </UserLayout>
              </ThemeProvider>
            }
          />
          <Route
            path="/withdraw-history"
            element={
              <ThemeProvider>
                <UserLayout>
                  <WithdrawHistoryPage />
                </UserLayout>
              </ThemeProvider>
            }
          />
          <Route
            path="/notices"
            element={
              <ThemeProvider>
                <UserLayout>
                  <NoticePage />
                </UserLayout>
              </ThemeProvider>
            }
          />
          <Route
            path="/product"
            element={
              <ThemeProvider>
                <UserLayout>
                  <ProductPage />
                </UserLayout>
              </ThemeProvider>
            }
          />
          <Route
            path="/product-history"
            element={
              <ThemeProvider>
                <UserLayout>
                  <ProductHistoryPage />
                </UserLayout>
              </ThemeProvider>
            }
          />

          {/* ─────────────── 관리자 로그인 ─────────────── */}
          <Route path="/ad-da/login" element={<AdminLogin />} />

          {/* ─────────── 관리자 레이아웃 ─────────── */}
          <Route
            path="/ad-da/*"
            element={
              <AdminProtectedRoute>
                <AdminLayout />
              </AdminProtectedRoute>
            }
          >
            <Route index element={<Navigate to="notices" replace />} />
            <Route path="members" element={<AdminMembersPage />} />
            <Route path="tree" element={<AdminTreePage />} />
            <Route path="tree/recommend" element={<AdminTreePage />} />
            <Route path="tree/sponsor" element={<AdminTreeSponsorPage />} />
            <Route path="deposit" element={<AdminDepositPage />} />
            <Route path="withdraws" element={<AdminWithdrawPage />} />
            <Route path="rewards" element={<AdminRewardsPage />} />
            <Route path="code-rewards" element={<AdminCodeGivePage />} />
            <Route path="points" element={<PointAdjustPage />} />
            <Route path="notices" element={<AdminNoticesPage />} />
            <Route path="centers" element={<AdminCentersPage />} />
            <Route path="products" element={<AdminProductsPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
            <Route path="settings/admins" element={<AdminAdminsPage />} />
          </Route>

          {/* ─────────────── Not Found ─────────────── */}
          <Route path="*" element={<div className="p-10">❌ 페이지를 찾을 수 없습니다.</div>} />
        </Routes>
      </IdleTimerProvider>
    </Router>
  );
}
