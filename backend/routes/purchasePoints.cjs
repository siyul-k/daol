// ✅ 파일 위치: backend/routes/purchasePoints.cjs

const express = require('express');
const router = express.Router();
const pool = require('../db.cjs');

// ✅ 사용 가능 포인트 조회 API (member_id, point_balance 기준 통일)
router.get('/:username', async (req, res) => {
  const { username } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT id AS member_id, point_balance
       FROM members
       WHERE username = ?
       LIMIT 1`,
      [username]
    );
    if (rows.length === 0) return res.status(404).json({ error: '회원 없음' });

    const { member_id, point_balance } = rows[0];
    res.json({
      member_id,
      available_point: point_balance
    });
  } catch (err) {
    res.status(500).json({ error: '포인트 조회 실패' });
  }
});

module.exports = router;
