// ✅ 파일 경로: frontend/src/pages/WithdrawPage.jsx
import React, { useEffect, useState } from 'react';
import axios from '../axiosConfig';

export default function WithdrawPage() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const username = user.username;
  const member_id = user.id;

  const [userInfo, setUserInfo] = useState({
    bank_name: '',
    account_holder: '',
    account_number: '',
  });

  const [settings, setSettings] = useState({
    withdraw_fee_percent: 0,
    withdraw_min_amount: 0,
  });

  // ✅ 서버 계산값과 동일한 기준으로 표기 (normal, center 모두 /api/withdraw/available 사용)
  const [available, setAvailable] = useState({ general: 0, center: 0 });
  const [allowed, setAllowed] = useState({ general: true, center: false });

  const [general, setGeneral] = useState({ request_amount: '', fee: 0, payout: 0 });
  const [center, setCenter] = useState({ request_amount: '', fee: 0, payout: 0 });

  const BANKS = [
    "KB국민", "NH농협", "IBK기업", "우리", "신한", "KEB하나", "KDB산업", "BNK경남",
    "BNK부산", "SC제일", "광주", "전북", "제주", "HSBC", "아이엠뱅크", "우체국",
    "새마을금고", "수협", "신협", "SBI저축", "씨티은행", "케이뱅크", "카카오뱅크", "토스뱅크"
  ];

  useEffect(() => {
    if (!username) return;

    // 회원 은행정보
    axios.get(`/api/members/username/${username}`)
      .then(res => {
        const d = res.data;
        setUserInfo({
          bank_name: d.bank_name || '',
          account_holder: d.account_holder || '',
          account_number: d.account_number || ''
        });
      })
      .catch(() => console.warn('회원정보 로드 실패'));

    // 설정값
    axios.get('/api/settings')
      .then(res => {
        const map = {};
        (res.data || []).forEach(r => { map[r.key_name] = r.value; });
        setSettings({
          withdraw_fee_percent: parseFloat(map.withdraw_fee_percent || 0),
          withdraw_min_amount: parseInt(map.withdraw_min_amount || '0', 10)
        });
      })
      .catch(() => console.warn('설정 로드 실패'));

    // ✅ 출금 가능액 (서버와 동일 공식)
    axios.get(`/api/withdraw/available?username=${username}`)
      .then(res => {
        setAvailable({
          general: res.data?.normal || 0,
          center:  res.data?.center || 0
        });
      })
      .catch(() => console.warn('출금가능금액 조회 실패'));

    // 출금 가능여부(요일/시간/최소금액)
    axios.get('/api/withdraw/check', { params: { type: 'normal', amount: 0 } })
      .then(res => setAllowed(prev => ({ ...prev, general: res.data.canWithdraw })))
      .catch(() => console.warn('일반 출금 체크 실패'));

    axios.get('/api/withdraw/check', { params: { type: 'center', amount: 0 } })
      .then(res => setAllowed(prev => ({ ...prev, center: res.data.canWithdraw })))
      .catch(() => console.warn('센터 출금 체크 실패'));
  }, [username]);

  useEffect(() => {
    // 설정 변경 시 수수료 재계산
    if (general.request_amount) handleInputChange('general', general.request_amount);
    if (center.request_amount) handleInputChange('center', center.request_amount);
    // eslint-disable-next-line
  }, [settings]);

  const handleInputChange = async (typeLabel, value) => {
    const amt = parseInt(value, 10) || 0;
    const feeRate = Number(settings.withdraw_fee_percent || 0);
    const fee = Math.floor(amt * feeRate / 100);
    const payout = Math.max(0, amt - fee); // 화면용: (신청금액 - 수수료)

    const update = { request_amount: value, fee, payout };
    if (typeLabel === 'general') setGeneral(update);
    else setCenter(update);

    try {
      const typeValue = typeLabel === 'general' ? 'normal' : 'center';
      const res = await axios.get('/api/withdraw/check', {
        params: { type: typeValue, amount: amt }
      });
      setAllowed(prev => ({ ...prev, [typeLabel]: res.data.canWithdraw }));
    } catch {
      console.warn('허용여부 재체크 실패');
    }
  };

  const handleSubmit = async (typeLabel, form) => {
    const amt = parseInt(form.request_amount, 10) || 0;
    const availableAmount = typeLabel === 'general' ? available.general : available.center;

    if (amt < settings.withdraw_min_amount) {
      return alert(`최소 ${settings.withdraw_min_amount.toLocaleString()}원 이상 신청해야 합니다.`);
    }
    if (amt > availableAmount) {
      return alert('출금 가능 금액을 초과할 수 없습니다.');
    }
    if (!userInfo.bank_name || !userInfo.account_holder || !userInfo.account_number) {
      return alert('은행/예금주/계좌번호를 모두 입력해주세요.');
    }
    if (!allowed[typeLabel]) {
      return alert('현재 출금이 허용되지 않는 시간·요일·금액입니다.');
    }

    const confirmMsg = typeLabel === 'general' ? '일반 출금' : '센터피 출금';
    if (!window.confirm(`${confirmMsg}을 신청하시겠습니까?`)) return;

    const typeValue = typeLabel === 'general' ? 'normal' : 'center';

    try {
      await axios.post('/api/withdraw', {
        username,
        member_id,
        amount: amt,
        type: typeValue,
        bank_name: userInfo.bank_name,
        account_holder: userInfo.account_holder,
        account_number: userInfo.account_number,
        memo: ''
      });
      alert('출금 신청이 완료되었습니다.');
      window.location.href = '/withdraw-history';
    } catch (e) {
      alert(e?.response?.data?.error || '서버 오류로 출금 신청에 실패했습니다.');
    }
  };

  const renderForm = (title, state, typeLabel) => {
    const isCenter = typeLabel === 'center';
    const amtAllowed = isCenter ? available.center : available.general;
    const canApply = allowed[typeLabel];

    return (
      <div className="max-w-md mx-auto bg-white p-6 rounded shadow mb-8">
        <h2 className="text-xl font-bold mb-4 text-center">{title}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-500">출금가능금액</label>
            <input
              readOnly
              className="w-full p-2 border rounded bg-gray-100 text-right"
              value={amtAllowed.toLocaleString()}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500">출금신청금액</label>
            <input
              type="number"
              className="w-full p-2 border rounded text-right"
              placeholder="출금신청금액"
              value={state.request_amount}
              onChange={e => handleInputChange(typeLabel, e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500">수수료</label>
            <input
              readOnly
              className="w-full p-2 border rounded bg-gray-100 text-right"
              value={state.fee.toLocaleString()}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500">출금액 (신청금액 - 수수료)</label>
            <input
              readOnly
              className="w-full p-2 border rounded bg-gray-100 text-right"
              value={state.payout.toLocaleString()}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500">입금은행</label>
            <select
              className="w-full p-2 border rounded"
              value={userInfo.bank_name}
              onChange={e =>
                setUserInfo(prev => ({ ...prev, bank_name: e.target.value }))
              }
            >
              <option value="">입금은행 선택</option>
              {BANKS.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-500">예금주</label>
            <input
              className="w-full p-2 border rounded"
              value={userInfo.account_holder}
              onChange={e =>
                setUserInfo(prev => ({ ...prev, account_holder: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-sm text-gray-500">계좌번호</label>
            <input
              className="w-full p-2 border rounded"
              value={userInfo.account_number}
              onChange={e =>
                setUserInfo(prev => ({ ...prev, account_number: e.target.value }))
              }
            />
          </div>
        </div>
        <button
          disabled={!canApply}
          className={`mt-6 w-full py-2 rounded text-white font-bold ${
            canApply ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 cursor-not-allowed'
          }`}
          onClick={() => handleSubmit(typeLabel, state)}
        >
          출금 신청
        </button>
      </div>
    );
  };

  return (
    <div className="py-10 px-4">
      {renderForm('출금 신청', general, 'general')}
      {renderForm('출금 신청 (센터피)', center, 'center')}
    </div>
  );
}
