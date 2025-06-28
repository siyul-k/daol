import React, { useEffect, useState } from 'react';
import axios from '../axiosConfig';
import { formatKST } from '../utils/time';  // 시간 변환 함수 import

export default function ProductHistoryPage() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  const currentUser = JSON.parse(localStorage.getItem('user'));

  const fetchPurchases = async () => {
    try {
      const res = await axios.get(`/api/purchase-history?username=${currentUser.username}`);
      setPurchases(res.data);
    } catch (err) {
      console.error('구매내역 불러오기 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
  }, []);

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6">구매내역</h1>

      {loading ? (
        <p>불러오는 중...</p>
      ) : purchases.length === 0 ? (
        <p>구매내역이 없습니다.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border border-gray-300 text-center">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-3 py-2">구매일시</th>
                <th className="border px-3 py-2">금액</th>
                <th className="border px-3 py-2">PV</th>
                <th className="border px-3 py-2">종류</th>
                <th className="border px-3 py-2">상태</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((item) => (
                <tr key={item.id}>
                  <td className="border px-3 py-2">
                    {formatKST(item.created_at)}  {/* 시간 변환 적용 */}
                  </td>
                  <td className="border px-3 py-2">
                    {Number(item.amount).toLocaleString()}
                  </td>
                  <td className="border px-3 py-2">
                    {Number(item.pv).toLocaleString()}
                  </td>
                  <td className="border px-3 py-2">
                    {item.type === 'normal' ? '기본' : '보너스'}
                  </td>
                  <td className="border px-3 py-2">
                    {item.status === 'approved' ? '승인완료' : item.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
