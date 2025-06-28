// ✅ 파일 경로: backend/routes/rank.cjs
const express = require('express');
const router = express.Router();
const connection = require('../db.cjs');

// ✅ 회원의 rank 조회 (username 기반)
router.get('/:username', (req, res) => {
  const { username } = req.params;

  // ✅ 요청 파라미터 검증
  if (!username || typeof username !== 'string' || username === 'undefined') {
    return res.status(400).json({ error: '잘못된 요청: username 없음' });
  }

  const sql = 'SELECT id AS member_id, username, rank FROM members WHERE username = ? LIMIT 1';

  connection.query(sql, [username], (err, rows) => {
    if (err) {
      console.error("❌ [rank.cjs] DB 오류:", err);
      return res.status(500).json({ error: 'DB 오류', details: err });
    }

    if (!rows || rows.length === 0) {
      console.warn(`⚠️ [rank.cjs] 회원 없음: ${username}`);
      return res.status(404).json({ error: '회원 정보 없음' });
    }

    // rank만 보내지 않고, member_id/username/rank 모두 전달
    res.json({
      member_id: rows[0].member_id,
      username: rows[0].username,
      rank: rows[0].rank
    });
  });
});

module.exports = router;
