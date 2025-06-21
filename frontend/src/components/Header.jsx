import React from 'react';
import './Header.css';

export default function Header() {
  return (
    <header className="header">
      <div className="header__logo">Admin</div>
      <nav className="header__nav">
        <ul>
          <li>공지사항</li>
          <li>회원관리</li>
          <li>조직도</li>
          <li>지급목록</li>
          <li>판매관리</li>
          <li>입금관리</li>
          <li>출금관리</li>
          <li>쇼핑몰관리</li>
          <li>환경설정</li>
          <li>수당관리</li>
        </ul>
      </nav>
      <div className="header__profile">
        <img src="/path/to/profile.jpg" alt="프로필" />
      </div>
    </header>
  );
}
