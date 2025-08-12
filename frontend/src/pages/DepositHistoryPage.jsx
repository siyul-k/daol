// ✅ 파일 위치: frontend/src/pages/DepositHistoryPage.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../axiosConfig';
import { formatKST } from '../utils/time';

export default function DepositHistoryPage() {
  const navigate = useNavigate();

  // localStorage 파싱은 최초 한 번만 (참조 안정화)
  const [username] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      return u?.username || '';
    } catch {
      return '';
    }
  });

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) {
      setLoading(false);
      navigate('/login');
      return;
    }
    const ctrl = new AbortController();

    (async () => {
      try {
        const { data } = await axios.get(
          `/api/deposit/username/${encodeURIComponent(username)}`,
          { signal: ctrl.signal }
        );
        setHistory(Array.isArray(data) ? data : []);
      } catch (err) {
        if (err.name !== 'CanceledError' && err.name !== 'AbortError') {
          console.error('입금내역 조회 실패:', err);
        }
      } finally {
        setLoading(false);
      }
    })();

    return () => ctrl.abort(); // 언마운트 시 요청 취소
  }, [username, navigate]);

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
                  <td className="border px-3 py-2">{formatKST(r.created_at)}</td>
                  <td className="border px-3 py-2">{mapStatus(r.status)}</td>
                  <td className="border px-3 py-2">{r.account_holder}</td>
                  <td className="border px-3 py-2">{Number(r.amount).toLocaleString()}</td>
                  <td className="border px-3 py-2">
                    {r.completed_at ? formatKST(r.completed_at) : '-'}
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
