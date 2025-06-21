// ✅ 파일 위치: backend/routes/purchase-history.cjs

const express = require('express');
const router = express.Router();
const connection = require('../db.cjs');

// ✅ 회원별 구매내역 조회 (username 기준)
router.get('/', (req, res) => {
  const { username } = req.query;

  if (!username) {
    return res.status(400).json({ error: 'username은 필수입니다.' });
  }

  const sql = `
    SELECT 
      p.id, 
      p.amount, 
      p.pv, 
      p.status, 
      p.created_at, 
      pk.name AS package_name,
      pk.type
    FROM purchases p
    JOIN members m ON p.member_id = m.id
    LEFT JOIN packages pk ON p.package_id = pk.id
    WHERE m.username = ?
    ORDER BY p.created_at DESC
  `;

  connection.query(sql, [username], (err, results) => {
    if (err) {
      console.error('❌ 구매내역 조회 실패:', err);
      return res.status(500).json({ error: '구매내역 조회 중 서버 오류' });
    }

    res.json(results);
  });
});

module.exports = router;
