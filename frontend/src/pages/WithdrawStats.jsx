// ✅ 파일 경로: frontend/src/pages/WithdrawStats.jsx
import React, { useEffect, useState } from 'react';
import axios from '../axiosConfig';

export default function WithdrawStats() {
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    thisMonth: 0,
    lastMonth: 0
  });

  useEffect(() => {
    axios.get('/api/admin/withdraws/stats')
      .then(res => setStats(res.data))
      .catch(err => console.error('출금 통계 조회 실패:', err));
  }, []);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* 총 출금금액 */}
      <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 
                      rounded p-4 text-center shadow">
        <div className="text-gray-500 dark:text-gray-400 text-sm">총 출금금액</div>
        <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {stats.total.toLocaleString()} 원
        </div>
      </div>

      {/* 오늘 출금금액 */}
      <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 
                      rounded p-4 text-center shadow">
        <div className="text-gray-500 dark:text-gray-400 text-sm">오늘 출금금액</div>
        <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {stats.today.toLocaleString()} 원
        </div>
      </div>

      {/* 당월 출금금액 */}
      <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 
                      rounded p-4 text-center shadow">
        <div className="text-gray-500 dark:text-gray-400 text-sm">당월 출금금액</div>
        <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {stats.thisMonth.toLocaleString()} 원
        </div>
      </div>

      {/* 전월 출금금액 */}
      <div className="bg-white dark:bg-gray-800 border dark:border-gray-700 
                      rounded p-4 text-center shadow">
        <div className="text-gray-500 dark:text-gray-400 text-sm">전월 출금금액</div>
        <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {stats.lastMonth.toLocaleString()} 원
        </div>
      </div>
    </div>
  );
}
