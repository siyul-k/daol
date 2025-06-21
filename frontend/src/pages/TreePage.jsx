// ✅ 파일 경로: src/pages/TreePage.jsx

import React from 'react';
import SponsorTreePage from './SponsorTreePage';
import RecommendTreePage from './RecommendTreePage';
import { useLocation } from 'react-router-dom';

export default function TreePage() {
  const location = useLocation();
  const currentUser = JSON.parse(localStorage.getItem("user"));
  const isSponsor = location.pathname.includes("sponsor");

  return isSponsor ? (
    <SponsorTreePage username={currentUser.username} isAdmin={false} />
  ) : (
    <RecommendTreePage username={currentUser.username} isAdmin={false} />
  );
}
