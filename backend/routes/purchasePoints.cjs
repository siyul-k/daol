// ✅ 파일 위치: backend/routes/purchasePoints.cjs

const express = require('express');
const router = express.Router();
const connection = require('../db.cjs');

// ✅ 사용 가능 포인트 조회 API (member_id, point_balance 기준 통일)
router.get('/:username', (req, res) => {
  const { username } = req.params;

  const sql = `
    SELECT id AS member_id, point_balance
    FROM members
    WHERE username = ?
    LIMIT 1
  `;

  connection.query(sql, [username], (err, results) => {
    if (err) return res.status(500).json({ error: '포인트 조회 실패' });
    if (results.length === 0) return res.status(404).json({ error: '회원 없음' });

    const { member_id, point_balance } = results[0];
    res.json({
      member_id,
      available_point: point_balance
    });
  });
});

module.exports = router;
