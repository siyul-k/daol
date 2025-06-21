// ✅ 파일 경로: frontend/src/pages/DepositStats.jsx
import React, { useEffect, useState } from 'react';
import axios from '../axiosConfig';

export default function DepositStats() {
  const [stats, setStats] = useState({ total: 0, today: 0, month: 0, prevMonth: 0 });

  useEffect(() => {
    axios.get('/api/admin/deposits/stats')
      .then(res => setStats(res.data))
      .catch(err => console.error('입금 통계 조회 실패:', err));
  }, []);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-white border rounded p-4 text-center shadow">
        <div className="text-gray-500 text-sm">총 입금금액</div>
        <div className="text-xl font-bold">{stats.total?.toLocaleString?.() || 0} 원</div>
      </div>
      <div className="bg-white border rounded p-4 text-center shadow">
        <div className="text-gray-500 text-sm">오늘 입금금액</div>
        <div className="text-xl font-bold">{stats.today?.toLocaleString?.() || 0} 원</div>
      </div>
      <div className="bg-white border rounded p-4 text-center shadow">
        <div className="text-gray-500 text-sm">당월 입금금액</div>
        <div className="text-xl font-bold">{stats.month?.toLocaleString?.() || 0} 원</div>
      </div>
      <div className="bg-white border rounded p-4 text-center shadow">
        <div className="text-gray-500 text-sm">전월 입금금액</div>
        <div className="text-xl font-bold">{stats.prevMonth?.toLocaleString?.() || 0} 원</div>
      </div>
    </div>
  );
}
