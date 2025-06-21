// ✅ src/pages/WithdrawFormPage.jsx
import React, { useState } from 'react';

export default function WithdrawFormPage() {
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    bank_name: '',
    account_holder: '',
    account_number: '',
    amount: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch('/api/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await res.json();
      if (res.ok) {
        alert('출금 신청이 완료되었습니다.');
        setFormData({
          username: '',
          name: '',
          bank_name: '',
          account_holder: '',
          account_number: '',
          amount: '',
        });
      } else {
        alert(result.message || '신청 실패');
      }
    } catch (err) {
      console.error('출금 신청 오류:', err);
      alert('서버 오류');
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4">
      <h2 className="text-xl font-bold mb-4">출금 신청</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input name="username" placeholder="아이디" value={formData.username} onChange={handleChange} className="w-full border p-2 rounded" />
        <input name="name" placeholder="이름" value={formData.name} onChange={handleChange} className="w-full border p-2 rounded" />
        <input name="bank_name" placeholder="은행명" value={formData.bank_name} onChange={handleChange} className="w-full border p-2 rounded" />
        <input name="account_holder" placeholder="예금주" value={formData.account_holder} onChange={handleChange} className="w-full border p-2 rounded" />
        <input name="account_number" placeholder="계좌번호" value={formData.account_number} onChange={handleChange} className="w-full border p-2 rounded" />
        <input name="amount" type="number" placeholder="출금금액" value={formData.amount} onChange={handleChange} className="w-full border p-2 rounded" />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">출금 신청</button>
      </form>
    </div>
  );
}
