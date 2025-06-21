// ✅ 파일 경로: backend/routes/withdrawCheck.cjs
const express = require('express');
const router = express.Router();
const connection = require('../db.cjs');

const getSetting = async (key) => {
  const [rows] = await connection.promise().query(
    'SELECT value FROM settings WHERE key_name = ? LIMIT 1',
    [key]
  );
  return rows[0]?.value || null;
};

// ✅ 출금 가능 여부 확인
router.get('/', async (req, res) => {
  const { type, amount } = req.query;

  if (!type || !['normal', 'center'].includes(type)) {
    return res.status(400).json({ error: 'type must be normal or center' });
  }

  try {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.toLocaleString('en-US', { weekday: 'short' }).toLowerCase(); // mon, tue, ...

    // ✅ 설정 키 선택
    const dayKey = type === 'normal' ? 'withdraw_days' : 'center_withdraw_days';
    const startKey = type === 'normal' ? 'withdraw_start_hour' : 'center_withdraw_start_hour';
    const endKey = type === 'normal' ? 'withdraw_end_hour' : 'center_withdraw_end_hour';

    // ✅ DB에서 설정값 가져오기
    const [daysStr, startHourStr, endHourStr, minAmountStr] = await Promise.all([
      getSetting(dayKey),
      getSetting(startKey),
      getSetting(endKey),
      getSetting('withdraw_min_amount'),
    ]);

    const allowedDays = daysStr ? daysStr.split(',') : [];
    const startHour = parseInt(startHourStr);
    const endHour = parseInt(endHourStr);
    const minAmount = parseInt(minAmountStr || '0');
    const requestAmount = parseInt(amount || '0');

    // ✅ 현재 요일과 시간 조건 확인
    const isDayAllowed = allowedDays.includes(currentDay);
    const isHourAllowed = currentHour >= startHour && currentHour < endHour;
    const isAmountAllowed = requestAmount >= minAmount;

    const canWithdraw = isDayAllowed && isHourAllowed && isAmountAllowed;

    res.json({
      canWithdraw,
      currentDay,
      currentHour,
      allowedDays,
      startHour,
      endHour,
      minAmount,
      requestAmount,
      isDayAllowed,
      isHourAllowed,
      isAmountAllowed
    });
  } catch (err) {
    console.error('출금 가능 여부 확인 오류:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
