// ✅ 파일: src/components/admin/AdminSidebar.jsx
import React from "react";
import { Link } from "react-router-dom";

export default function AdminSidebar({ isOpen, closeSidebar }) {
  return (
    <div
      className={`fixed top-0 left-0 h-full bg-white shadow-lg z-50 w-64 transform transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
    >
      <div className="p-4 font-bold text-xl border-b">관리자 메뉴</div>
      <ul className="flex flex-col gap-2 p-4">
        <li><Link to="/admin/dashboard" onClick={closeSidebar}>🏠 대시보드</Link></li>
        <li><Link to="/admin/notice" onClick={closeSidebar}>📢 공지사항</Link></li>
        <li><Link to="/admin/members" onClick={closeSidebar}>👥 회원관리</Link></li>
        <li><Link to="/admin/tree" onClick={closeSidebar}>🌳 조직도</Link></li>
        <li><Link to="/admin/bonus" onClick={closeSidebar}>💸 지급목록</Link></li>
        <li><Link to="/admin/sales" onClick={closeSidebar}>📦 판매관리</Link></li>
        <li><Link to="/admin/deposit" onClick={closeSidebar}>💰 입금관리</Link></li>
        <li><Link to="/admin/withdraw" onClick={closeSidebar}>🏧 출금관리</Link></li>
        <li><Link to="/admin/centers" onClick={closeSidebar}>🏢 센터관리</Link></li> {/* ✅ 추가된 항목 */}
        <li><Link to="/admin/settings" onClick={closeSidebar}>⚙️ 환경설정</Link></li>
        <li><Link to="/admin/bonus-log" onClick={closeSidebar}>📊 수당관리</Link></li>
      </ul>
    </div>
  );
}
