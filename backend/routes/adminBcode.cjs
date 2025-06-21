const express = require('express');
const router = express.Router();
const connection = require('../db.cjs');

// ✅ 관리자 Bcode 지급
router.post('/', (req, res) => {
  const { username, package_id } = req.body;

  if (!username || !package_id) {
    return res.status(400).json({ error: 'username과 package_id 필요' });
  }

  const getUserSql = 'SELECT id FROM members WHERE username = ?';
  connection.query(getUserSql, [username], (err, userResults) => {
    if (err) return res.status(500).json({ error: '회원 조회 오류' });
    if (userResults.length === 0) return res.status(404).json({ error: '회원 없음' });

    const userId = userResults[0].id;

    const getPackageSql = 'SELECT * FROM packages WHERE id = ? AND type = "bcode"';
    connection.query(getPackageSql, [package_id], (err2, pkgResults) => {
      if (err2 || pkgResults.length === 0)
        return res.status(400).json({ error: 'Bcode 패키지 없음' });

      const pkg = pkgResults[0];

      const insertSql = `
        INSERT INTO purchases (member_id, package_id, amount, pv, type, status, created_at)
        VALUES (?, ?, ?, ?, 'bcode', 'approved', NOW())
      `;
      connection.query(insertSql, [userId, pkg.id, pkg.price, pkg.pv], (err3) => {
        if (err3) return res.status(500).json({ error: 'Bcode 지급 실패' });
        res.json({ success: true, message: 'Bcode 패키지가 지급되었습니다.' });
      });
    });
  });
});

module.exports = router;
