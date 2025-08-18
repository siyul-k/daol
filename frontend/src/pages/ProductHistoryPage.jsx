// ✅ 파일 경로: frontend/src/pages/ProductHistoryPage.jsx
import React, { useEffect, useState } from 'react';
import axios from '../axiosConfig';
import { formatKST } from '../utils/time';

export default function ProductHistoryPage() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchPurchases = async () => {
    try {
      const res = await axios.get(`/api/purchase-history?username=${currentUser.username}`);
      setPurchases(res.data || []);
    } catch (err) {
      console.error('구매내역 불러오기 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6">구매내역</h1>

      {loading ? (
        <p className="text-gray-600 dark:text-gray-400">불러오는 중...</p>
      ) : purchases.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-400">구매내역이 없습니다.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border border-gray-300 dark:border-gray-600 text-center">
            <thead className="bg-gray-100 dark:bg-gray-700">
              <tr>
                <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-800 dark:text-gray-200">
                  구매일시
                </th>
                <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-800 dark:text-gray-200">
                  금액
                </th>
                <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-800 dark:text-gray-200">
                  PV
                </th>
                <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-800 dark:text-gray-200">
                  종류
                </th>
                <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-800 dark:text-gray-200">
                  상태
                </th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-gray-100">
                    {formatKST(item.created_at)}
                  </td>
                  <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-right text-gray-900 dark:text-gray-100">
                    {Number(item.amount).toLocaleString()}
                  </td>
                  <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-right text-gray-900 dark:text-gray-100">
                    {Number(item.pv).toLocaleString()}
                  </td>
                  <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-gray-100">
                    {item.type === 'normal' ? '기본' : '보너스'}
                  </td>
                  <td className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-gray-900 dark:text-gray-100">
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
