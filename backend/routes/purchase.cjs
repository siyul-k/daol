const express = require('express');
const router = express.Router();
const connection = require('../db.cjs');

// ✅ 패키지 기반 구매 API
router.post('/', (req, res) => {
  const { username, package_id } = req.body;

  if (!username || !package_id) {
    return res.status(400).json({ error: 'username 및 package_id는 필요합니다.' });
  }

  const getUserSql = 'SELECT id, point_balance FROM members WHERE username = ?';
  connection.query(getUserSql, [username], (err, userResults) => {
    if (err) return res.status(500).json({ error: 'DB 조회 오류 (회원)' });
    if (userResults.length === 0) return res.status(404).json({ error: '회원 없음' });

    const user = userResults[0];

    const getPackageSql = 'SELECT * FROM packages WHERE id = ?';
    connection.query(getPackageSql, [package_id], (err2, pkgResults) => {
      if (err2) return res.status(500).json({ error: 'DB 조회 오류 (패키지)' });
      if (pkgResults.length === 0) return res.status(404).json({ error: '패키지 없음' });

      const pkg = pkgResults[0];

      if (user.point_balance < pkg.price) {
        return res.status(400).json({ error: '포인트 부족' });
      }

      const insertSql = `
        INSERT INTO purchases (member_id, package_id, amount, pv, type, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'approved', NOW())
      `;
      connection.query(insertSql, [user.id, pkg.id, pkg.price, pkg.pv, pkg.type], (err3) => {
        if (err3) return res.status(500).json({ error: '구매 등록 실패' });

        const updateSql = 'UPDATE members SET point_balance = point_balance - ? WHERE id = ?';
        connection.query(updateSql, [pkg.price, user.id], (err4) => {
          if (err4) return res.status(500).json({ error: '포인트 차감 실패' });
          res.json({ success: true, message: '상품이 구매되었습니다.' });
        });
      });
    });
  });
});
