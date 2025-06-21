// ✅ 파일 위치: backend/routes/productPurchase.cjs

const express = require('express');
const router = express.Router();
const connection = require('../db.cjs');

// ✅ 패키지 기반 상품 구매 API
router.post('/', (req, res) => {
  const { username, package_id } = req.body;

  if (!username || !package_id) {
    return res.status(400).json({ error: 'username과 package_id는 필수입니다.' });
  }

  // 1. 회원 정보 가져오기
  const getUserSql = 'SELECT id, point_balance FROM members WHERE username = ?';
  connection.query(getUserSql, [username], (err, userResult) => {
    if (err) return res.status(500).json({ error: '회원 조회 오류' });
    if (userResult.length === 0) return res.status(404).json({ error: '회원 없음' });

    const user = userResult[0];

    // 2. 패키지 정보 가져오기
    const getPackageSql = 'SELECT * FROM packages WHERE id = ?';
    connection.query(getPackageSql, [package_id], (err2, pkgResult) => {
      if (err2) return res.status(500).json({ error: '패키지 조회 오류' });
      if (pkgResult.length === 0) return res.status(404).json({ error: '패키지 없음' });

      const pkg = pkgResult[0];

      // 3. 포인트 부족 확인
      if (user.point_balance < pkg.price) {
        return res.status(400).json({ error: '포인트 부족' });
      }

      // 4. 트랜잭션 시작
      connection.beginTransaction(err3 => {
        if (err3) return res.status(500).json({ error: '트랜잭션 시작 실패' });

        // 5. 구매 기록 저장
        const insertSql = `
          INSERT INTO purchases (member_id, package_id, amount, pv, type, status, created_at)
          VALUES (?, ?, ?, ?, ?, 'approved', NOW())
        `;
        connection.query(
          insertSql,
          [user.id, pkg.id, pkg.price, pkg.pv, pkg.type],
          (err4) => {
            if (err4) return connection.rollback(() => {
              res.status(500).json({ error: '구매 등록 실패' });
            });

            // 6. 포인트 차감
            const updateSql = `UPDATE members SET point_balance = point_balance - ? WHERE id = ?`;
            connection.query(updateSql, [pkg.price, user.id], (err5) => {
              if (err5) return connection.rollback(() => {
                res.status(500).json({ error: '포인트 차감 실패' });
              });

              connection.commit(err6 => {
                if (err6) return connection.rollback(() => {
                  res.status(500).json({ error: '커밋 실패' });
                });

                res.json({ success: true, message: '구매 완료' });
              });
            });
          }
        );
      });
    });
  });
});

module.exports = router;
