// ✅ 파일 경로: backend/routes/withdrawAvailable.cjs
const express = require('express');
const router = express.Router();
const connection = require('../db.cjs');

// ✅ 출금 가능 금액 조회
router.get('/', async (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'username is required' });

  try {
    // ✅ 일반 수당 (센터피/센터추천 제외)
    const [normalRewards] = await connection.promise().query(
      `SELECT IFNULL(SUM(amount), 0) AS total
       FROM rewards_log
       WHERE user_id = ? AND type NOT IN ('center_fee', 'center_recommend')`,
      [username]
    );

    const [normalWithdraws] = await connection.promise().query(
      `SELECT IFNULL(SUM(amount), 0) AS total
       FROM withdraw_requests
       WHERE username = ? AND type = 'normal' AND status IN ('요청', '완료')`,
      [username]
    );

    // ✅ 센터피 수당만
    const [centerRewards] = await connection.promise().query(
      `SELECT IFNULL(SUM(amount), 0) AS total
       FROM rewards_log
       WHERE user_id = ? AND type IN ('center_fee', 'center_recommend')`,
      [username]
    );

    const [centerWithdraws] = await connection.promise().query(
      `SELECT IFNULL(SUM(amount), 0) AS total
       FROM withdraw_requests
       WHERE username = ? AND type = 'center' AND status IN ('요청', '완료')`,
      [username]
    );

    const normal = normalRewards[0].total - normalWithdraws[0].total;
    const center = centerRewards[0].total - centerWithdraws[0].total;

    res.json({
      normal: normal > 0 ? normal : 0,
      center: center > 0 ? center : 0,
    });
  } catch (err) {
    console.error('❌ 출금 가능액 계산 오류:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

module.exports = router;
