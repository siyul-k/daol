// ✅ 파일 위치: src/components/UserLayout.jsx

import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Home,
  DollarSign,
  Share2,
  LogIn,
  LogOut,
  Package,
  Bell,
  Settings,
} from "lucide-react";

export default function UserLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  const navItems = [
    { label: "대시보드", path: "/dashboard", icon: <Home size={16} /> },
    {
      label: "포인트내역",
      icon: <DollarSign size={16} />,
      children: [
        { label: "포인트내역", path: "/point" },
        { label: "포인트요약", path: "/point/summary" },
      ],
    },
    {
      label: "조직도",
      icon: <Share2 size={16} />,
      children: [
        // 후원조직도 메뉴 삭제, 추천조직도만 남김
        { label: "조직도", path: "/tree/recommend" },
      ],
    },
    {
      label: "입금",
      icon: <LogIn size={16} />,
      children: [
        { label: "입금신청", path: "/deposit" },
        { label: "입금내역", path: "/deposit-history" },
      ],
    },
    {
      label: "출금",
      icon: <LogOut size={16} />,
      children: [
        { label: "출금신청", path: "/withdraw" },
        { label: "출금내역", path: "/withdraw-history" },
      ],
    },
    {
      label: "상품구매",
      icon: <Package size={16} />,
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
    // ✅ 폰트 클래스 추가 (전체 적용)
    <div className="min-h-screen bg-gray-50 font-jua">
      {/* ✅ 상단 메뉴 바 */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
  <div className="backdrop-blur-xl bg-white/60 border border-gray-200 shadow-lg rounded-3xl px-8 py-2 flex items-center">
    <span
      className="text-3xl font-extrabold tracking-wider"
      style={{
        background: 'linear-gradient(90deg, #4976f7 10%, #1fd1f9 90%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}
    >
      DAOL
    </span>
  </div>
</div>

          <div className="flex flex-wrap gap-4">
            <NavigationMenu>
              <NavigationMenuList className="flex flex-wrap gap-2">
                {navItems.map((item, idx) =>
                  item.children ? (
                    <NavigationMenuItem key={idx}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="text-base font-bold inline-flex items-center gap-1"
                          >
                            {item.icon} {item.label}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {item.children.map((child, ci) => (
                            <DropdownMenuItem key={ci} asChild>
                              <Link to={child.path}>{child.label}</Link>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </NavigationMenuItem>
                  ) : (
                    <NavigationMenuItem key={idx}>
                      {item.action ? (
                        <Button
                          variant="ghost"
                          className="text-base font-bold inline-flex items-center gap-1"
                          onClick={item.action}
                        >
                          {item.icon} {item.label}
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          className={`text-base font-bold inline-flex items-center gap-1 ${
                            location.pathname === item.path
                              ? "text-blue-600 font-bold"
                              : ""
                          }`}
                          onClick={() => navigate(item.path)}
                        >
                          {item.icon} {item.label}
                        </Button>
                      )}
                    </NavigationMenuItem>
                  )
                )}
              </NavigationMenuList>
            </NavigationMenu>
          </div>
        </div>
      </div>

      {/* ✅ 본문 콘텐츠 */}
      <main className="max-w-screen-xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}

