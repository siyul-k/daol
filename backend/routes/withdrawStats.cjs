// ✅ 파일 경로: backend/routes/withdrawStats.cjs

const express = require('express');
const router = express.Router();
const connection = require('../db.cjs');

// username → member_id 변환 함수
async function getMemberId(username) {
  const [[row]] = await connection.promise().query(
    'SELECT id FROM members WHERE username = ? LIMIT 1',
    [username]
  );
  return row ? row.id : null;
}

router.get('/:username', async (req, res) => {
  const { username } = req.params;

  try {
    // username → member_id 변환
    const member_id = await getMemberId(username);
    if (!member_id) {
      return res.status(404).json({ error: '존재하지 않는 회원입니다.' });
    }

    const [rows] = await connection.promise().query(
      `SELECT IFNULL(SUM(amount), 0) AS total_withdraw
       FROM withdraw_requests
       WHERE member_id = ? AND status IN ('요청', '완료')`,
      [member_id]
    );

    const total = rows[0]?.total_withdraw || 0;
    res.json({ total_withdraw: total });
  } catch (err) {
    console.error('❌ 총 출금액 조회 오류:', err);
    res.status(500).json({ error: '총 출금액 계산 실패' });
  }
});

module.exports = router;
