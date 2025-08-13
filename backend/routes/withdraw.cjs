// ✅ 파일 경로: backend/routes/withdraw.cjs
const express = require('express');
const router = express.Router();
const pool = require('../db.cjs'); // connection → pool

const VALID_TYPES = new Set(['normal', 'center']);

async function getSetting(key, fallback = '0') {
  const [[row]] = await pool.query(
    `SELECT value FROM settings WHERE key_name = ? LIMIT 1`,
    [key]
  );
  return row?.value ?? fallback;
}

// 이번주 월요일 00:00:00 (서버 로컬 기준)
function getWeekStart() {
  const now = new Date();
  const day = now.getDay() || 7; // Sun=0 → 7
  now.setHours(0, 0, 0, 0);
  now.setDate(now.getDate() - day + 1);
  return now.toISOString().slice(0, 19).replace('T', ' ');
}

// ✅ 일반(노말) 출금 가능액: rewards_log(센터계열 제외) − withdraw_requests(normal, 요청/완료)
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

// ✅ 센터 출금 가능액: 이번주 월요일 이전 센터적립 − withdraw_requests(center, 요청/완료)
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

// 1) 출금 신청 (username 기준)
router.post('/', async (req, res) => {
  const {
    username, amount, type, bank_name, account_holder, account_number, memo = ''
  } = req.body;

  if (!username || !amount || !type || !bank_name || !account_holder || !account_number) {
    return res.status(400).json({ error: '모든 항목을 입력해주세요.' });
  }
  if (!VALID_TYPES.has(type)) {
    return res.status(400).json({ error: 'type은 normal 또는 center만 가능합니다.' });
  }

  try {
    // 회원 확인 & 출금금지 체크
    const [[userRow]] = await pool.query(
      `SELECT id, is_withdraw_blocked FROM members WHERE username = ? LIMIT 1`,
      [username]
    );
    if (!userRow) return res.status(404).json({ error: '존재하지 않는 회원입니다.' });
    if (userRow.is_withdraw_blocked) {
      return res.status(403).json({ error: '출금이 금지된 회원입니다.' });
    }
    const member_id = userRow.id;
    const reqAmount = parseInt(amount, 10) || 0;

    // ⚙️ 정책값
    const minAmount = parseInt(await getSetting('withdraw_min_amount', '100000'), 10);     // 기본 10만
    const dailyLimit = parseInt(await getSetting('withdraw_daily_limit', '2000000'), 10);  // 기본 200만

    // ✅ 최소 출금액 검사
    if (reqAmount < minAmount) {
      return res.status(400).json({ error: `최소 ${minAmount.toLocaleString()}원 이상 신청해야 합니다.` });
    }

    // ✅ 1일 한도 검사(요청/완료 합산)
    const [[daySum]] = await pool.query(
      `SELECT IFNULL(SUM(amount),0) AS total
         FROM withdraw_requests
        WHERE member_id = ?
          AND DATE(created_at) = CURDATE()
          AND status IN ('요청','완료','requested','completed')`,
      [member_id]
    );
    const todayTotal = Number(daySum?.total || 0);
    if (todayTotal + reqAmount > dailyLimit) {
      return res.status(400).json({
        error: `1일 출금 한도 ${dailyLimit.toLocaleString()}원을 초과합니다. (오늘 신청/완료 합계: ${todayTotal.toLocaleString()}원)`
      });
    }

    // ✅ 가용잔액 검사 (type별)
    const available =
      type === 'normal'
        ? await getNormalAvailable(member_id)
        : await getCenterAvailable(member_id);

    if (reqAmount > available) {
      return res.status(400).json({ error: '출금 가능 금액을 초과할 수 없습니다.' });
    }

    // ✅ 10초 내 중복 신청 방지
    const [[existing]] = await pool.query(
      `SELECT id FROM withdraw_requests
        WHERE member_id = ? AND amount = ? AND status = '요청'
          AND created_at >= NOW() - INTERVAL 10 SECOND`,
      [member_id, reqAmount]
    );
    if (existing) {
      return res.status(400).json({ error: '이미 유사한 출금 신청이 처리 중입니다. 잠시 후 다시 시도해주세요.' });
    }

    // ✅ 수수료/쇼핑포인트/실지급액 계산
    const feePercent  = parseFloat(await getSetting('withdraw_fee_percent', '0')) || 0;
    const shopPercent = parseFloat(await getSetting('withdraw_shopping_point_percent', '0')) || 0;

    const fee        = Math.floor(reqAmount * feePercent / 100);
    const afterFee   = reqAmount - fee;
    const shopping_point = Math.floor(afterFee * shopPercent / 100);
    const payout     = afterFee - shopping_point;

    // ✅ 출금요청 등록
    await pool.query(
      `INSERT INTO withdraw_requests
        (member_id, username, type, amount, fee, payout, shopping_point,
         bank_name, account_holder, account_number,
         status, memo, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '요청', ?, NOW())`,
      [member_id, username, type, reqAmount, fee, payout, shopping_point,
       bank_name, account_holder, account_number, memo]
    );

    res.json({ success: true, message: '출금 신청 완료' });
  } catch (err) {
    console.error('❌ 출금 신청 실패:', err);
    res.status(500).json({ error: '출금 신청 실패' });
  }
});

// 2) 출금내역 조회 (member_id와 username 모두 지원)
router.get('/', async (req, res) => {
  const { member_id, username } = req.query;
  let _member_id = member_id;

  try {
    if (!_member_id && username) {
      const [[userRow]] = await pool.query(
        `SELECT id FROM members WHERE username = ? LIMIT 1`,
        [username]
      );
      if (!userRow) return res.status(404).json({ error: '존재하지 않는 회원입니다.' });
      _member_id = userRow.id;
    }
    if (!_member_id) {
      return res.status(400).json({ error: 'username 또는 member_id 쿼리 파라미터가 필요합니다.' });
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
    console.error('❌ 출금내역 조회 실패:', err);
    res.status(500).json({ error: '출금내역 조회 실패' });
  }
});

module.exports = router;
