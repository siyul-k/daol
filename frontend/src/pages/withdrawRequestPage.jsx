import React, { useState } from 'react';

export default function WithdrawRequestPage() {
  const [form, setForm] = useState({
    amount: '',
    bank_name: '',
    account_holder: '',
    account_number: '',
  });

  const [message, setMessage] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    try {
      const res = await fetch('/api/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const result = await res.json();

      if (res.ok) {
        setMessage('출금 신청이 완료되었습니다.');
        setForm({ amount: '', bank_name: '', account_holder: '', account_number: '' });
      } else {
        setMessage(result.message || '출금 신청 실패');
      }
    } catch (err) {
      console.error('에러:', err);
      setMessage('서버 오류');
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white shadow rounded">
      <h2 className="text-2xl font-bold mb-4">출금 신청</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-semibold">출금금액</label>
          <input
            type="number"
            name="amount"
            value={form.amount}
            onChange={handleChange}
            required
            className="w-full border px-3 py-2 rounded"
          />
        </div>
        <div>
          <label className="block font-semibold">은행명</label>
          <input
            type="text"
            name="bank_name"
            value={form.bank_name}
            onChange={handleChange}
            required
            className="w-full border px-3 py-2 rounded"
          />
        </div>
        <div>
          <label className="block font-semibold">예금주</label>
          <input
            type="text"
            name="account_holder"
            value={form.account_holder}
            onChange={handleChange}
            required
            className="w-full border px-3 py-2 rounded"
          />
        </div>
        <div>
          <label className="block font-semibold">계좌번호</label>
          <input
            type="text"
            name="account_number"
            value={form.account_number}
            onChange={handleChange}
            required
            className="w-full border px-3 py-2 rounded"
          />
        </div>
        <button
          type="submit"
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          출금 신청
        </button>
        {message && <p className="mt-2 text-center text-sm text-red-600">{message}</p>}
      </form>
    </div>
  );
}
