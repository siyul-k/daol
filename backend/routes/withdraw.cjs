// ✅ 파일 경로: backend/routes/withdraw.cjs

const express = require('express');
const router = express.Router();
const connection = require('../db.cjs');

// ✅ 1) 회원 출금 신청
router.post('/', async (req, res) => {
  const {
    username,
    amount,
    type, // 'normal' or 'center'
    bank_name,
    account_holder,
    account_number,
    memo = ''
  } = req.body;

  if (!username || !amount || !type || !bank_name || !account_holder || !account_number) {
    return res.status(400).json({ error: '모든 항목을 입력해주세요.' });
  }

  try {
    // 수수료 계산
    const [[{ value: feePercent }]] = await connection.promise().query(
      `SELECT value FROM settings WHERE key_name='withdraw_fee_percent' LIMIT 1`
    );
    const fee = Math.floor(amount * parseFloat(feePercent) / 100);
    const payout = amount - fee;

    // 출금요청 등록
    await connection.promise().query(
      `INSERT INTO withdraw_requests
       (username, type, amount, fee, payout, bank_name, account_holder, account_number, status, memo, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, '요청', ?, NOW())`,
      [username, type, amount, fee, payout, bank_name, account_holder, account_number, memo]
    );

    res.json({ success: true, message: '출금 신청 완료' });
  } catch (err) {
    console.error('❌ 출금 신청 실패:', err);
    res.status(500).json({ error: '출금 신청 실패' });
  }
});

// ✅ 2) 회원 출금 내역 조회 (프론트 `GET /api/withdraw?username=...` 호출 지원)
router.get('/', (req, res) => {
  const { username } = req.query;
  if (!username) {
    return res.status(400).json({ error: 'username 쿼리 파라미터가 필요합니다.' });
  }

  connection.query(
    `SELECT id, type, status, amount, fee, payout,
            bank_name, account_holder, account_number,
            memo, created_at
     FROM withdraw_requests
     WHERE username = ?
     ORDER BY created_at DESC`,
    [username],
    (err, rows) => {
      if (err) {
        console.error('❌ 출금내역 조회 실패:', err);
        return res.status(500).json({ error: '출금내역 조회 실패' });
      }
      res.json(rows);
    }
  );
});

// ✅ 3) 이전에 추가된 “history” 경로는 더 이상 필요 없으므로 제거했습니다
//    (프론트가 이제 `GET /api/withdraw?username=` 를 사용합니다)

module.exports = router;
