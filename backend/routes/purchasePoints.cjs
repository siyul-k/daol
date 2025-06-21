// ✅ 파일 위치: backend/routes/purchasePoints.cjs

const express = require('express');
const router = express.Router();
const connection = require('../db.cjs');

// ✅ 사용 가능 포인트 조회 API (point_balance 기준으로 통일)
router.get('/:username', (req, res) => {
  const { username } = req.params;

  const sql = `
    SELECT id, point_balance
    FROM members
    WHERE username = ?
  `;

  connection.query(sql, [username], (err, results) => {
    if (err) return res.status(500).json({ error: '포인트 조회 실패' });
    if (results.length === 0) return res.status(404).json({ error: '회원 없음' });

    const data = results[0];
    res.json({
      user_id: data.id,
      available_point: data.point_balance
    });
  });
});

module.exports = router;
