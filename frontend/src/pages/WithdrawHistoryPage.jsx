import React, { useEffect, useState } from 'react';
import axios from '../axiosConfig';
import { formatKST } from '../utils/time';  // 시간 변환 함수 import

export default function WithdrawHistoryPage() {
  // localStorage 값: '1234:alice' 또는 'alice'
  const stored = localStorage.getItem('username') || '';
  let member_id = '';
  let username = '';

  if (stored.includes(':')) {
    [member_id, username] = stored.split(':');
  } else {
    username = stored;
  }

  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!member_id && !username) return;

    const params = member_id ? { member_id } : { username };

    axios
      .get(`/api/withdraw`, { params })
      .then(res => setList(res.data || []))
      .catch(err => {
        console.error('❌ 출금내역 조회 실패:', err);
        alert('출금내역을 불러오는 중 오류가 발생했습니다.');
      })
      .finally(() => setLoading(false));
  }, [member_id, username]);

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6">출금내역</h1>
      {loading ? (
        <p>불러오는 중...</p>
      ) : list.length === 0 ? (
        <p>출금 내역이 없습니다.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] border border-gray-300 text-center">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-3 py-2">등록일시</th>
                <th className="border px-3 py-2">종류</th>
                <th className="border px-3 py-2">상태</th>
                <th className="border px-3 py-2">출금신청금액</th>
                <th className="border px-3 py-2">수수료</th>
                <th className="border px-3 py-2">출금액</th>
                <th className="border px-3 py-2">쇼핑포인트</th>
                <th className="border px-3 py-2">입금은행</th>
                <th className="border px-3 py-2">예금주</th>
                <th className="border px-3 py-2">계좌번호</th>
                <th className="border px-3 py-2">비고</th>
              </tr>
            </thead>
            <tbody>
              {list.map(row => (
                <tr key={row.id}>
                  <td className="border px-3 py-2">{formatKST(row.created_at)}</td> {/* 시간 변환 적용 */}
                  <td className="border px-3 py-2">{row.type === 'normal' ? '일반' : '센터'}</td>
                  <td className="border px-3 py-2">{row.status}</td>
                  <td className="border px-3 py-2 text-right">{Number(row.amount).toLocaleString()}</td>
                  <td className="border px-3 py-2 text-right">{Number(row.fee).toLocaleString()}</td>
                  <td className="border px-3 py-2 text-right">{Number(row.payout).toLocaleString()}</td>
                  <td className="border px-3 py-2 text-right">{Number(row.shopping_point || 0).toLocaleString()}</td>
                  <td className="border px-3 py-2">{row.bank_name}</td>
                  <td className="border px-3 py-2">{row.account_holder}</td>
                  <td className="border px-3 py-2">{row.account_number}</td>
                  <td className="border px-3 py-2">{row.memo || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
