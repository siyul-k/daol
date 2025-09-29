// ✅ 파일 경로: backend/routes/withdrawCheck.cjs
const express = require('express');
const router = express.Router();
const pool = require('../db.cjs');
const moment = require('moment-timezone');   // ✅ 한국시간 변환용

// ✅ DB 설정 가져오기 유틸
const getSetting = async (key) => {
  const [rows] = await pool.query(
    'SELECT value FROM settings WHERE key_name = ? LIMIT 1',
    [key]
  );
  return rows[0]?.value || null;
};

// ✅ 출금 가능 여부 확인 (일반/센터)
router.get('/', async (req, res) => {
  const { type, amount } = req.query;

  if (!type || !['normal', 'center'].includes(type)) {
    return res.status(400).json({ error: 'type must be normal or center' });
  }

  try {
    // ✅ 한국시간 기준 현재 시각
    const now = moment().tz('Asia/Seoul');
    const currentHour = now.hour();                          // 0 ~ 23
    const currentDay  = now.format('ddd').toLowerCase();     // mon, tue, wed ...

    // ✅ 설정 키 선택
    const dayKey   = type === 'normal' ? 'withdraw_days'            : 'center_withdraw_days';
    const startKey = type === 'normal' ? 'withdraw_start_hour'      : 'center_withdraw_start_hour';
    const endKey   = type === 'normal' ? 'withdraw_end_hour'        : 'center_withdraw_end_hour';

    // ✅ DB에서 설정값 가져오기
    const [daysStr, startHourStr, endHourStr, minAmountStr] = await Promise.all([
      getSetting(dayKey),
      getSetting(startKey),
      getSetting(endKey),
      getSetting('withdraw_min_amount'),
    ]);

    const allowedDays   = daysStr ? daysStr.split(',').map(s => s.trim().toLowerCase()) : [];
    const startHour     = parseInt(startHourStr || '0', 10);
    const endHour       = parseInt(endHourStr   || '24', 10);
    const minAmount     = parseInt(minAmountStr || '0', 10);
    const requestAmount = parseInt(amount       || '0', 10);

    // ✅ 조건 확인
    const isDayAllowed    = !allowedDays.length || allowedDays.includes(currentDay);
    const isHourAllowed   = (endHour === 0 ? 24 : endHour) > startHour
      ? currentHour >= startHour && currentHour < endHour
      : currentHour >= startHour || currentHour < endHour;
    const isAmountAllowed = requestAmount >= minAmount;

    const canWithdraw = isDayAllowed && isHourAllowed && isAmountAllowed;

    // ✅ 응답
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
    console.error('❌ 출금 가능 여부 확인 오류:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
