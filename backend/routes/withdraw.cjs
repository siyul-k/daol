// ✅ 파일 경로: backend/routes/withdraw.cjs
const express = require('express');
const router = express.Router();
const pool = require('../db.cjs');
const moment = require('moment-timezone');   // ✅ 한국시간 변환용

const VALID_TYPES = new Set(['normal', 'center']);

async function getSetting(key, fallback = '0') {
  const [[row]] = await pool.query(
    `SELECT value FROM settings WHERE key_name = ? LIMIT 1`,
    [key]
  );
  return row?.value ?? fallback;
}

function getWeekStart() {
  const now = moment().tz('Asia/Seoul'); // ✅ 한국시간
  const day = now.isoWeekday();          // 1=월 ~ 7=일
  const start = now.clone().startOf('day').subtract(day - 1, 'days');
  return start.format('YYYY-MM-DD HH:mm:ss');
}

function parseDaysCsv(csv) {
  if (!csv) return [];
  return csv.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
}
const dayStr = ["sun","mon","tue","wed","thu","fri","sat"];

function isHourAllowedWithOvernight(startHour, endHour, currentHour) {
  if (endHour === 0) endHour = 24;
  if (startHour < endHour) {
    return currentHour >= startHour && currentHour < endHour;
  } else {
    return currentHour >= startHour || currentHour < endHour;
  }
}

async function checkNormalWindow() {
  const daysCsv = await getSetting('withdraw_days', '');
  const startHour = parseInt(await getSetting('withdraw_start_hour', '0'), 10);
  let endHour = parseInt(await getSetting('withdraw_end_hour', '24'), 10);
  if (endHour === 0) endHour = 24;

  const allowedDays = parseDaysCsv(daysCsv);

  const now = moment().tz('Asia/Seoul'); // ✅ 한국시간
  const today = dayStr[now.day()];       // 0=일~6=토
  const currentHour = now.hour();

  const isDayAllowed = !allowedDays.length || allowedDays.includes(today);
  const isHourAllowed = isHourAllowedWithOvernight(startHour, endHour, currentHour);

  return { ok: isDayAllowed && isHourAllowed, allowedDays, startHour, endHour, currentDay: today, currentHour, isDayAllowed, isHourAllowed };
}

async function checkCenterWindow() {
  const daysCsv = await getSetting('center_withdraw_days', '');
  const startHour = parseInt(await getSetting('center_withdraw_start_hour', '0'), 10);
  let endHour = parseInt(await getSetting('center_withdraw_end_hour', '24'), 10);
  if (endHour === 0) endHour = 24;

  const allowedDays = parseDaysCsv(daysCsv);

  const now = moment().tz('Asia/Seoul'); // ✅ 한국시간
  const today = dayStr[now.day()];
  const currentHour = now.hour();

  const isDayAllowed = !allowedDays.length || allowedDays.includes(today);
  const isHourAllowed = isHourAllowedWithOvernight(startHour, endHour, currentHour);

  return { ok: isDayAllowed && isHourAllowed, allowedDays, startHour, endHour, currentDay: today, currentHour, isDayAllowed, isHourAllowed };
}

async function getNormalAvailable(member_id) {
  const [[rw]] = await pool.query(
    `SELECT IFNULL(SUM(amount),0) AS total
     FROM rewards_log
     WHERE member_id = ?
       AND type NOT IN ('center','center_recommend')`,
    [member_id]
  );
  const [[wd]] = await pool.query(
    `SELECT IFNULL(SUM(amount),0) AS total
     FROM withdraw_requests
     WHERE member_id = ?
       AND type='normal'
       AND status IN ('요청','완료','requested','completed')`,
    [member_id]
  );
  return Math.max(0, Number(rw?.total || 0) - Number(wd?.total || 0));
}

async function getCenterAvailable(member_id) {
  const weekStart = getWeekStart();
  const [[rw]] = await pool.query(
    `SELECT IFNULL(SUM(amount),0) AS total
     FROM rewards_log
     WHERE member_id = ?
       AND type IN ('center','center_recommend')
       AND created_at < ?`,
    [member_id, weekStart]
  );
  const [[wd]] = await pool.query(
    `SELECT IFNULL(SUM(amount),0) AS total
     FROM withdraw_requests
     WHERE member_id = ?
       AND type='center'
       AND status IN ('요청','완료','requested','completed')`,
    [member_id]
  );
  return Math.max(0, Number(rw?.total || 0) - Number(wd?.total || 0));
}

// ✅ 출금 가능 여부 체크
router.get('/check', async (req, res) => {
  const { type, username, amount } = req.query;
  if (!VALID_TYPES.has(type)) {
    return res.status(400).json({ error: '잘못된 type' });
  }
  try {
    let member_id = null;
    if (username) {
      const [[member]] = await pool.query(
        `SELECT id FROM members WHERE username = ? LIMIT 1`, [username]
      );
      if (member) member_id = member.id;
    }

    const windowCheck = type === 'normal' ? await checkNormalWindow() : await checkCenterWindow();
    const minAmount = parseInt(await getSetting('withdraw_min_amount', '100000'), 10);
    const requestAmount = parseInt(amount || 0, 10);

    let isAmountAllowed = true;
    if (requestAmount > 0) {
      if (requestAmount < minAmount) isAmountAllowed = false;
      if (member_id) {
        const available = type === 'normal'
          ? await getNormalAvailable(member_id)
          : await getCenterAvailable(member_id);
        if (requestAmount > available) isAmountAllowed = false;
      }
    }

    res.json({
      canWithdraw: windowCheck.ok && isAmountAllowed,
      currentDay: windowCheck.currentDay,
      currentHour: windowCheck.currentHour,
      allowedDays: windowCheck.allowedDays,
      startHour: windowCheck.startHour,
      endHour: windowCheck.endHour,
      minAmount,
      requestAmount,
      isDayAllowed: windowCheck.isDayAllowed,
      isHourAllowed: windowCheck.isHourAllowed,
      isAmountAllowed
    });
  } catch (err) {
    console.error('❌ /check 실패:', err);
    res.status(500).json({ error: '/check 실패' });
  }
});

// ✅ 출금 신청
router.post('/', async (req, res) => {
  const { username, amount, type, bank_name, account_holder, account_number, memo = '' } = req.body;
  if (!username || !amount || !type || !bank_name || !account_holder || !account_number) {
    return res.status(400).json({ error: '모든 항목을 입력해주세요.' });
  }
  if (!VALID_TYPES.has(type)) {
    return res.status(400).json({ error: 'type은 normal 또는 center만 가능합니다.' });
  }
  try {
    const [[userRow]] = await pool.query(
      `SELECT id, is_withdraw_blocked FROM members WHERE username = ? LIMIT 1`, [username]
    );
    if (!userRow) return res.status(404).json({ error: '존재하지 않는 회원입니다.' });
    if (userRow.is_withdraw_blocked) {
      return res.status(403).json({ error: '출금이 금지된 회원입니다.' });
    }
    const member_id = userRow.id;
    const reqAmount = parseInt(amount, 10) || 0;
    const minAmount  = parseInt(await getSetting('withdraw_min_amount', '100000'), 10);
    const dailyLimit = parseInt(await getSetting('withdraw_daily_limit', '2000000'), 10);

    if (reqAmount < minAmount) {
      return res.status(400).json({ error: `최소 ${minAmount}원 이상 신청해야 합니다.` });
    }

    const windowCheck = type === 'normal' ? await checkNormalWindow() : await checkCenterWindow();
    if (!windowCheck.ok) {
      return res.status(400).json({ error: '출금 가능 요일/시간이 아닙니다.' });
    }

    // ✅ 오늘 하루(KST) 범위 계산
    const todayStart = moment().tz('Asia/Seoul').startOf('day').format('YYYY-MM-DD HH:mm:ss');
    const todayEnd   = moment().tz('Asia/Seoul').endOf('day').format('YYYY-MM-DD HH:mm:ss');

    if (type === 'normal') {
      const [[daySum]] = await pool.query(
        `SELECT IFNULL(SUM(amount),0) AS total
           FROM withdraw_requests
          WHERE member_id = ?
            AND created_at BETWEEN ? AND ?
            AND status IN ('요청','완료','requested','completed')`,
        [member_id, todayStart, todayEnd]
      );
      if (Number(daySum?.total || 0) + reqAmount > dailyLimit) {
        return res.status(400).json({ error: '1일 출금 한도 초과' });
      }
    }

    const available = type === 'normal'
      ? await getNormalAvailable(member_id)
      : await getCenterAvailable(member_id);
    if (reqAmount > available) {
      return res.status(400).json({ error: '출금 가능 금액 초과' });
    }

    const [[existing]] = await pool.query(
      `SELECT id FROM withdraw_requests
       WHERE member_id = ? AND amount = ? AND status = '요청'
         AND created_at >= CONVERT_TZ(NOW(), '+00:00', '+09:00') - INTERVAL 10 SECOND`,
      [member_id, reqAmount]
    );
    if (existing) {
      return res.status(400).json({ error: '중복 신청' });
    }

    const feePercent  = parseFloat(await getSetting('withdraw_fee_percent', '0')) || 0;
    const shopPercent = parseFloat(await getSetting('withdraw_shopping_point_percent', '0')) || 0;
    const fee      = Math.floor(reqAmount * feePercent);
    const afterFee = reqAmount - fee;
    const shopping_point = Math.floor(afterFee * shopPercent);
    const payout   = afterFee - shopping_point;

    // 출금 신청 저장
    await pool.query(
      `INSERT INTO withdraw_requests
       (member_id, username, type, amount, fee, payout, shopping_point,
        bank_name, account_holder, account_number,
        status, memo, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '요청', ?, NOW())`,
      [member_id, username, type, reqAmount, fee, payout, shopping_point,
       bank_name, account_holder, account_number, memo]
    );

    // ✅ withdrawable_point 차감
    await pool.query(
      `UPDATE members 
          SET withdrawable_point = withdrawable_point - ? 
        WHERE id = ?`,
      [reqAmount, member_id]
    );

    res.json({ success: true, message: '출금 신청 완료' });
  } catch (err) {
    console.error('❌ 출금 신청 실패:', err);
    res.status(500).json({ error: '출금 신청 실패' });
  }
});

// ✅ 출금 내역 조회
router.get('/', async (req, res) => {
  const { member_id, username } = req.query;
  let _member_id = member_id;
  try {
    if (!_member_id && username) {
      const [[userRow]] = await pool.query(
        `SELECT id FROM members WHERE username = ? LIMIT 1`, [username]
      );
      if (!userRow) return res.status(404).json({ error: '회원 없음' });
      _member_id = userRow.id;
    }
    if (!_member_id) {
      return res.status(400).json({ error: 'username 또는 member_id 필요' });
    }
    const [rows] = await pool.query(
      `SELECT id, type, status, amount, fee, payout, shopping_point,
              bank_name, account_holder, account_number,
              memo, created_at
       FROM withdraw_requests
       WHERE member_id = ?
       ORDER BY created_at DESC`,
      [_member_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('❌ 출금 내역 조회 실패:', err);
    res.status(500).json({ error: '출금 내역 조회 실패' });
  }
});

module.exports = router;
