// src/components/Sidebar.jsx
import { Link, useLocation } from "react-router-dom";

export default function Sidebar() {
  const location = useLocation();
  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <div className="w-60 bg-white shadow-lg p-4 space-y-2">
      <h2 className="text-lg font-bold mb-4">◆ 대시보드</h2>
      <nav className="flex flex-col gap-1 text-sm">
        <Link to="/dashboard" className={isActive("/dashboard") ? "font-semibold text-blue-600" : ""}>
          ▶ 홈
        </Link>
        <Link to="/tree" className={isActive("/tree") ? "font-semibold text-blue-600" : ""}>
          ▶ 조직도
        </Link>
        <Link to="/point" className={isActive("/point") ? "font-semibold text-blue-600" : ""}>
          ▶ 포인트 내역
        </Link>

        <details className="group">
          <summary className="cursor-pointer">▶ 입금</summary>
          <div className="ml-4 flex flex-col">
            <Link to="/deposit">▷ 입금신청</Link>
            <Link to="/deposit/history">▷ 입금내역</Link>
          </div>
        </details>

        <details className="group">
          <summary className="cursor-pointer">▶ 출금</summary>
          <div className="ml-4 flex flex-col">
            <Link to="/withdraw">▷ 출금신청</Link>
            <Link to="/withdraw/history">▷ 출금내역</Link>
          </div>
        </details>

        <details className="group">
          <summary className="cursor-pointer">▶ 상품구매</summary>
          <div className="ml-4 flex flex-col">
            <Link to="/product">▷ 구매신청</Link>
            <Link to="/product/history">▷ 구매내역</Link>
          </div>
        </details>

        <Link to="/notice" className={isActive("/notice") ? "font-semibold text-blue-600" : ""}>
          ▶ 공지사항
        </Link>

        <Link to="/" className="text-red-500 mt-2">▶ 로그아웃</Link>
      </nav>
    </div>
  );
}
