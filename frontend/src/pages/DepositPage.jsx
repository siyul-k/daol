// ✅ 파일 경로: src/pages/DepositPage.jsx

import React, { useState } from 'react';
import axios from '../axiosConfig';
import { useNavigate } from 'react-router-dom';

export default function DepositPage() {
  const [form, setForm] = useState({ amount: '', account_holder: '', memo: '' });
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));

  const handleSubmit = async () => {
    if (!form.amount || !form.account_holder) {
      return alert('입금 금액과 예금주를 입력하세요');
    }
    try {
      await axios.post('/api/deposit', {
        username: user.username,
        amount: parseInt(form.amount),
        account_holder: form.account_holder,
        memo: form.memo,
      });
      alert('입금 신청이 완료되었습니다');
      navigate('/deposit-history'); // ✅ 신청 후 내역 페이지로 이동
    } catch (err) {
      console.error('입금 신청 실패:', err);
      alert('입금 신청 중 오류가 발생했습니다');
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-6 text-center">입금 신청</h2>
      <div className="flex justify-center">
        <div className="flex flex-col gap-2 max-w-md w-full">
          <select
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className="border px-3 py-2 rounded"
          >
            <option value="">금액 선택</option>
            {[1100000, 2200000, 3300000, 5500000, 11000000].map((v) => (
              <option key={v} value={v}>
                {v.toLocaleString()} 원
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="예금주"
            value={form.account_holder}
            onChange={(e) => setForm({ ...form, account_holder: e.target.value })}
            className="border px-3 py-2 rounded"
          />
          <input
            type="text"
            placeholder="비고 (선택)"
            value={form.memo}
            onChange={(e) => setForm({ ...form, memo: e.target.value })}
            className="border px-3 py-2 rounded"
          />
          <button onClick={handleSubmit} className="bg-blue-600 text-white px-4 py-2 rounded">
            입금 신청
          </button>
        </div>
      </div>
    </div>
  );
}
