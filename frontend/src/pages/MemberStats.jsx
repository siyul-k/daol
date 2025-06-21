// ✅ 파일 경로: frontend/src/pages/MemberStats.jsx
import React, { useEffect, useState } from 'react';
import axios from '../axiosConfig';

export default function MemberStats() {
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    blacklist: 0,
    center: 0,
  });

  useEffect(() => {
    axios.get('/api/admin/members/stats')
      .then(res => setStats(res.data))
      .catch(err => console.error('회원 통계 조회 실패:', err));
  }, []);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-white border rounded p-4 text-center shadow">
        <div className="text-gray-500 text-sm">전체회원</div>
        <div className="text-xl font-bold">{stats.total}</div>
      </div>
      <div className="bg-white border rounded p-4 text-center shadow">
        <div className="text-gray-500 text-sm">오늘등록</div>
        <div className="text-xl font-bold">{stats.today}</div>
      </div>
      <div className="bg-white border rounded p-4 text-center shadow">
        <div className="text-gray-500 text-sm">블랙리스트</div>
        <div className="text-xl font-bold">{stats.blacklist}</div>
      </div>
      <div className="bg-white border rounded p-4 text-center shadow">
        <div className="text-gray-500 text-sm">센터장</div>
        <div className="text-xl font-bold">{stats.center}</div>
      </div>
    </div>
  );
}
