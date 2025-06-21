// ✅ 파일 위치: src/components/AdminNavbar.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const AdminNavbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b shadow-sm bg-white sticky top-0 z-10">
      <div className="flex justify-between items-center p-3 md:hidden">
        <h1 className="font-bold">Admin Menu</h1>
        <button onClick={() => setIsOpen(!isOpen)} className="text-sm px-3 py-1 border rounded">
          {isOpen ? '닫기' : '메뉴'}
        </button>
      </div>

      <nav className={`flex-col md:flex-row md:flex md:gap-4 text-sm font-medium px-3 pb-3 md:pb-0 ${isOpen ? 'flex' : 'hidden'} md:block`}>        
        <Link to="/admin/notice" className="block py-1">공지사항</Link>
        <Link to="/admin/members" className="block py-1">회원관리</Link>
        <Link to="/admin/tree" className="block py-1">조직도</Link>
        <Link to="/admin/points" className="block py-1">지급목록</Link>
        <Link to="/admin/sales" className="block py-1">판매관리</Link>
        <Link to="/admin/deposit" className="block py-1">입금관리</Link>
        <Link to="/admin/withdraws" className="block py-1">출금관리</Link>
        <Link to="/admin/shop" className="block py-1">쇼핑몰관리</Link>
        <Link to="/admin/settings" className="block py-1">환경설정</Link>
        <Link to="/admin/rewards" className="block py-1">수당관리</Link>
      </nav>
    </div>
  );
};

export default AdminNavbar;
