// ✅ 파일 위치: frontend/src/components/AdminLayout.jsx
import React, { useState, useEffect, Suspense } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';

// ⬇️ 통계 컴포넌트는 lazy 로드(컴포넌트 바깥 최상단에서 선언)
const MemberStats   = React.lazy(() => import('../pages/MemberStats'));
const DepositStats  = React.lazy(() => import('../pages/DepositStats'));
const WithdrawStats = React.lazy(() => import('../pages/WithdrawStats'));

export default function AdminLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(null); // 드롭다운 토글 상태

  // 관리자 경로일 때만 통계 위젯 렌더
  const isAdminPath = pathname.startsWith('/admin/');

  // 라우트 변경 시 드롭다운 자동 닫기
  useEffect(() => {
    setMenuOpen(null);
  }, [pathname]);

  const navLinkClass = (path) =>
    `px-4 py-2 text-sm font-medium hover:text-yellow-300 ${
      pathname.startsWith(path) ? 'text-yellow-300' : 'text-white'
    }`;

  const dropdownItemClass = (path) =>
    `block px-4 py-1 text-sm whitespace-nowrap hover:text-yellow-300 ${
      pathname.startsWith(path) ? 'text-yellow-300' : 'text-white'
    }`;

  const handleLogout = () => {
    localStorage.removeItem('admin');
    navigate('/admin/login');
  };

  // 어떤 통계를 보여줄지 "엘리먼트"로 결정 (lazy 컴포넌트를 직접 렌더)
  let StatsEl = null;
  if (pathname.startsWith('/admin/members')) {
    StatsEl = <MemberStats />;
  } else if (pathname.startsWith('/admin/deposit')) {
    StatsEl = <DepositStats />;
  } else if (pathname.startsWith('/admin/withdraws')) {
    StatsEl = <WithdrawStats />;
  }

  const toggleMenu = (menuKey) => {
    setMenuOpen((prev) => (prev === menuKey ? null : menuKey));
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* 상단 바 */}
      <header className="bg-gray-800 text-white shadow sticky top-0 z-50">
        <div className="flex justify-between items-center px-4 py-3 md:px-6">
          <div className="text-xl font-bold">📊 Admin</div>
        </div>

        {/* 네비게이션 바 */}
        <nav className="bg-gray-900 text-white flex flex-wrap px-4 md:px-6 space-x-6 text-sm">
          <Link to="/admin/notices" className={navLinkClass('/admin/notices')}>공지사항</Link>
          <Link to="/admin/members" className={navLinkClass('/admin/members')}>회원관리</Link>

          {/* 조직도 */}
          <div className="relative">
            <button className="py-2" onClick={() => toggleMenu('org')}>
              조직도 ▾
            </button>
            {menuOpen === 'org' && (
              <div className="absolute bg-gray-800 shadow mt-1 rounded z-40">
                <Link to="/admin/tree" className={dropdownItemClass('/admin/tree/full')}>
                  추천 조직도
                </Link>
                <Link to="/admin/tree/sponsor" className={dropdownItemClass('/admin/tree/sponsor')}>
                  후원 조직도
                </Link>
              </div>
            )}
          </div>

          {/* 지급관리 */}
          <div className="relative">
            <button className="py-2" onClick={() => toggleMenu('reward')}>
              지급관리 ▾
            </button>
            {menuOpen === 'reward' && (
              <div className="absolute bg-gray-800 shadow mt-1 rounded z-40">
                <Link to="/admin/code-rewards" className={dropdownItemClass('/admin/code-rewards')}>
                  코드지급
                </Link>
                <Link to="/admin/points" className={dropdownItemClass('/admin/points')}>
                  포인트지급
                </Link>
              </div>
            )}
          </div>

          <Link to="/admin/deposit" className={navLinkClass('/admin/deposit')}>입금관리</Link>
          <Link to="/admin/withdraws" className={navLinkClass('/admin/withdraws')}>출금관리</Link>
          <Link to="/admin/products" className={navLinkClass('/admin/products')}>상품관리</Link>
          <Link to="/admin/centers" className={navLinkClass('/admin/centers')}>센터관리</Link>
          <Link to="/admin/rewards" className={navLinkClass('/admin/rewards')}>수당관리</Link>

          {/* 환경설정 */}
          <div className="relative">
            <button className="py-2" onClick={() => toggleMenu('setting')}>
              환경설정 ▾
            </button>
            {menuOpen === 'setting' && (
              <div className="absolute bg-gray-800 shadow mt-1 rounded z-40">
                <Link to="/admin/settings" className={dropdownItemClass('/admin/settings')}>
                  수당퍼센트
                </Link>
                <Link to="/admin/settings/admins" className={dropdownItemClass('/admin/settings/admins')}>
                  관리자계정
                </Link>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-1 text-sm text-red-400 hover:text-red-300"
                >
                  로그아웃
                </button>
              </div>
            )}
          </div>
        </nav>
      </header>

      {/* 통계 컴포넌트 (관리자 경로일 때만 lazy 로드) */}
      {isAdminPath && StatsEl && (
        <div className="bg-white shadow p-4 md:p-6">
          <Suspense fallback={null}>
            {StatsEl}
          </Suspense>
        </div>
      )}

      {/* 본문 콘텐츠 */}
      <main className="flex-1 bg-gray-50 p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}
