// ✅ 파일 위치: backend/routes/withdraw.cjs

const express = require('express');
const router = express.Router();
const connection = require('../db.cjs');

async function getSetting(key) {
  const [[row]] = await connection.promise().query(
    `SELECT value FROM settings WHERE key_name = ? LIMIT 1`,
    [key]
  );
  return parseFloat(row?.value || '0');
}

// 1) 출금 신청 (username 기준)
router.post('/', async (req, res) => {
  const {
    username, amount, type, bank_name, account_holder, account_number, memo = ''
  } = req.body;

  if (!username || !amount || !type || !bank_name || !account_holder || !account_number) {
    return res.status(400).json({ error: '모든 항목을 입력해주세요.' });
  }

  try {
    // 출금 금지 상태 체크
    const [[userRow]] = await connection.promise().query(
      `SELECT id, is_withdraw_blocked FROM members WHERE username = ? LIMIT 1`,
      [username]
    );
    if (!userRow) {
      return res.status(404).json({ error: '존재하지 않는 회원입니다.' });
    }
    if (userRow.is_withdraw_blocked) {
      return res.status(403).json({ error: '출금이 금지된 회원입니다.' });
    }
    const member_id = userRow.id;

    // 중복 신청 방지
    const [[existing]] = await connection.promise().query(
      `SELECT id FROM withdraw_requests
       WHERE member_id = ? AND amount = ? AND status = '요청'
       AND created_at >= NOW() - INTERVAL 10 SECOND`,
      [member_id, amount]
    );
    if (existing) {
      return res.status(400).json({ error: '이미 유사한 출금 신청이 처리 중입니다. 잠시 후 다시 시도해주세요.' });
    }

    // 수수료/쇼핑포인트 계산
    const feePercent = await getSetting('withdraw_fee_percent');
    const shopPercent = await getSetting('withdraw_shopping_point_percent');
    const fee = Math.floor(amount * feePercent / 100);
    const afterFee = amount - fee;
    const shopping_point = Math.floor(afterFee * shopPercent / 100);
    const payout = afterFee - shopping_point;

    // 출금요청 등록
    await connection.promise().query(
      `INSERT INTO withdraw_requests
       (member_id, username, type, amount, fee, payout, shopping_point,
        bank_name, account_holder, account_number,
        status, memo, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '요청', ?, NOW())`,
      [member_id, username, type, amount, fee, payout, shopping_point,
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
    // member_id 없으면 username으로 변환
    if (!_member_id && username) {
      const [[userRow]] = await connection.promise().query(
        `SELECT id FROM members WHERE username = ? LIMIT 1`,
        [username]
      );
      if (!userRow) return res.status(404).json({ error: '존재하지 않는 회원입니다.' });
      _member_id = userRow.id;
    }
    if (!_member_id) {
      return res.status(400).json({ error: 'username 또는 member_id 쿼리 파라미터가 필요합니다.' });
    }

    const [rows] = await connection.promise().query(
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
