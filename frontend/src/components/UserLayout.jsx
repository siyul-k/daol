// ✅ 파일 경로: src/layouts/UserLayout.jsx

import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Home, DollarSign, Share2, LogIn, LogOut, Package,
  Bell, Settings, Menu, X, ChevronDown, ChevronRight
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

export default function UserLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [openMenus, setOpenMenus] = useState({});

  const toggleSubMenu = (label) => {
    setOpenMenus((prev) => {
      const isOpen = prev[label];
      return isOpen ? {} : { [label]: true }; // 하나만 열리도록
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  const navItems = [
    { label: "대시보드", path: "/dashboard", icon: <Home size={16} /> },
    {
      label: "포인트내역", icon: <DollarSign size={16} />,
      children: [
        { label: "포인트내역", path: "/point" },
        { label: "포인트요약", path: "/point/summary" },
      ],
    },
    {
      label: "조직도", icon: <Share2 size={16} />,
      children: [
        { label: "추천조직도", path: "/tree/recommend" },
        { label: "후원조직도", path: "/tree/sponsor" },
      ],
    },
    {
      label: "입금", icon: <LogIn size={16} />,
      children: [
        { label: "입금신청", path: "/deposit" },
        { label: "입금내역", path: "/deposit-history" },
      ],
    },
    {
      label: "출금", icon: <LogOut size={16} />,
      children: [
        { label: "출금신청", path: "/withdraw" },
        { label: "출금내역", path: "/withdraw-history" },
      ],
    },
    {
      label: "상품구매", icon: <Package size={16} />,
      children: [
        { label: "구매신청", path: "/product" },
        { label: "구매내역", path: "/product-history" },
      ],
    },
    { label: "공지사항", path: "/notices", icon: <Bell size={16} /> },
    { label: "프로필", path: "/settings", icon: <Settings size={16} /> },
    { label: "로그아웃", action: handleLogout, icon: <LogOut size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f1120] font-jua text-slate-900 dark:text-slate-100 transition-colors">
      {/* 상단바 */}
      <div className="bg-white/80 dark:bg-white/5 border-b border-gray-200 dark:border-white/10 shadow-sm fixed top-0 left-0 right-0 z-50 backdrop-blur-xl">
        <div className="max-w-screen-xl mx-auto px-4 py-3 flex justify-between items-center">
          {/* 로고 */}
          <div>
            <Link
              to="/dashboard"
              className="font-extrabold tracking-tight flex items-center gap-1 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400"
            >
              DAOL
            </Link>
          </div>

          {/* ✅ 데스크탑 메뉴 (수정됨) */}
          <div className="hidden md:flex gap-4">
            {navItems.map((item, idx) => (
              <div key={idx} className="relative">
                {item.children ? (
                  <>
                    <Button
                      variant="ghost"
                      className={`text-base font-bold inline-flex items-center gap-1 whitespace-nowrap ${
                        openMenus[item.label] ? "text-blue-600 dark:text-cyan-300" : ""
                      }`}
                      onClick={() => toggleSubMenu(item.label)}
                    >
                      {item.icon} {item.label}
                    </Button>
                    {openMenus[item.label] && (
                      <div className="absolute bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 rounded-lg mt-2 min-w-[160px] z-50">
                        {item.children.map((child, ci) => (
                          <Link
                            key={ci}
                            to={child.path}
                            className="block px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 whitespace-nowrap"
                            onClick={() => setOpenMenus({})}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <Button
                    variant="ghost"
                    className={`text-base font-bold inline-flex items-center gap-1 whitespace-nowrap ${
                      location.pathname === item.path
                        ? "text-blue-600 dark:text-cyan-300"
                        : ""
                    }`}
                    onClick={() =>
                      item.action ? item.action() : navigate(item.path)
                    }
                  >
                    {item.icon} {item.label}
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* 우측: 테마 토글 + 모바일 메뉴 버튼 */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="md:hidden">
              <Button variant="ghost" onClick={() => setMenuOpen(true)}>
                <Menu size={24} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 모바일 사이드바 (원본 유지) */}
      <div
        className={`fixed top-0 left-0 h-full w-64 bg-white dark:bg-gray-900 shadow-lg transform transition-transform duration-300 z-50 ${
          menuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <span className="text-xl font-bold">메뉴</span>
          <Button variant="ghost" onClick={() => setMenuOpen(false)}>
            <X size={20} />
          </Button>
        </div>
        <div className="overflow-y-auto h-full pb-10">
          {navItems.map((item, idx) => (
            <div key={idx} className="border-b border-gray-200 dark:border-gray-700">
              {item.children ? (
                <>
                  <button
                    onClick={() => toggleSubMenu(item.label)}
                    className="w-full flex justify-between items-center px-4 py-3 font-bold hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <span className="flex items-center gap-2">
                      {item.icon} {item.label}
                    </span>
                    {openMenus[item.label] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  {openMenus[item.label] && (
                    <div className="bg-gray-50 dark:bg-gray-800">
                      {item.children.map((child, ci) => (
                        <Link
                          key={ci}
                          to={child.path}
                          onClick={() => setMenuOpen(false)}
                          className="block px-10 py-2 text-sm hover:bg-gray-200 dark:hover:bg-gray-700"
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <button
                  onClick={() => {
                    if (item.action) item.action();
                    else navigate(item.path);
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 font-bold flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  {item.icon} {item.label}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 본문 */}
      <main className="max-w-screen-xl mx-auto px-4 py-20">{children}</main>
    </div>
  );
}
