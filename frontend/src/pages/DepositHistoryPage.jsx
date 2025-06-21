// ✅ 파일 경로: src/pages/DepositHistoryPage.jsx

import React, { useEffect, useState } from 'react';
import axios from '../axiosConfig';

export default function DepositHistoryPage() {
  const [history, setHistory] = useState([]);
  const user = JSON.parse(localStorage.getItem('user'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    axios
      .get(`/api/deposit/${user.username}`)
      .then((res) => setHistory(res.data))
      .catch((err) => {
        console.error('입금내역 조회 실패:', err);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const mapStatus = (s) => (s === '요청' ? 'Pending' : s === '완료' ? 'Complete' : s);

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6">입금내역</h1>

      {loading ? (
        <p>불러오는 중...</p>
      ) : history.length === 0 ? (
        <p>조회된 내역이 없습니다.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border border-gray-300 text-center">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-3 py-2">등록일시</th>
                <th className="border px-3 py-2">상태</th>
                <th className="border px-3 py-2">입금자명</th>
                <th className="border px-3 py-2">신청금액</th>
                <th className="border px-3 py-2">입금확인시간</th>
                <th className="border px-3 py-2">비고</th>
              </tr>
            </thead>
            <tbody>
              {history.map((r) => (
                <tr key={r.id}>
                  <td className="border px-3 py-2">
                    {new Date(r.created_at).toLocaleString('ko-KR')}
                  </td>
                  <td className="border px-3 py-2">{mapStatus(r.status)}</td>
                  <td className="border px-3 py-2">{r.account_holder}</td>
                  <td className="border px-3 py-2">{Number(r.amount).toLocaleString()}</td>
                  <td className="border px-3 py-2">
                    {r.completed_at ? new Date(r.completed_at).toLocaleString('ko-KR') : '-'}
                  </td>
                  <td className="border px-3 py-2">{r.memo || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
