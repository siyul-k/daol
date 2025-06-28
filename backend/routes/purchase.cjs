// ✅ 파일 위치: backend/routes/purchase.cjs

const express = require('express');
const router = express.Router();
const connection = require('../db.cjs');

// ✅ 패키지 기반 구매 API (member_id 중심, 트랜잭션 적용)
router.post('/', (req, res) => {
  const { username, package_id } = req.body;

  if (!username || !package_id) {
    return res.status(400).json({ error: 'username 및 package_id는 필요합니다.' });
  }

  // 1. 회원 정보 가져오기
  const getUserSql = 'SELECT id, username, point_balance FROM members WHERE username = ?';
  connection.query(getUserSql, [username], (err, userResults) => {
    if (err) return res.status(500).json({ error: 'DB 조회 오류 (회원)' });
    if (userResults.length === 0) return res.status(404).json({ error: '회원 없음' });

    const user = userResults[0];

    // 2. 패키지 정보 가져오기
    const getPackageSql = 'SELECT * FROM packages WHERE id = ?';
    connection.query(getPackageSql, [package_id], (err2, pkgResults) => {
      if (err2) return res.status(500).json({ error: 'DB 조회 오류 (패키지)' });
      if (pkgResults.length === 0) return res.status(404).json({ error: '패키지 없음' });

      const pkg = pkgResults[0];
      const pkgType = pkg.type || 'normal';

      // 3. 포인트 부족 체크
      if (user.point_balance < pkg.price) {
        return res.status(400).json({ error: '포인트 부족' });
      }

      // 4. 트랜잭션 처리 (구매등록, 로그, 포인트 차감까지)
      connection.beginTransaction(err3 => {
        if (err3) return res.status(500).json({ error: '트랜잭션 시작 실패' });

        // 5. 구매 등록
        const insertSql = `
          INSERT INTO purchases (member_id, package_id, amount, pv, type, status, created_at)
          VALUES (?, ?, ?, ?, ?, 'approved', NOW())
        `;
        connection.query(insertSql, [user.id, pkg.id, pkg.price, pkg.pv, pkgType], (err4, result) => {
          if (err4) return connection.rollback(() => res.status(500).json({ error: '구매 등록 실패' }));

          // 6. 구매 로그 (purchase_logs) 기록(선택) - 테이블 있으면 사용
          const logSql = `
            INSERT INTO purchase_logs (member_id, username, package_id, amount, pv, type, created_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
          `;
          connection.query(logSql, [user.id, user.username, pkg.id, pkg.price, pkg.pv, pkgType], (err5) => {
            if (err5) return connection.rollback(() => res.status(500).json({ error: '구매 로그 실패' }));

            // 7. 포인트 차감
            const updateSql = 'UPDATE members SET point_balance = point_balance - ? WHERE id = ?';
            connection.query(updateSql, [pkg.price, user.id], (err6) => {
              if (err6) return connection.rollback(() => res.status(500).json({ error: '포인트 차감 실패' }));

              // ✅ 8. 최초구매일(first_purchase_at) 업데이트
              // purchases 테이블에 방금 INSERT된 created_at을 쓸 수도 있지만,
              // 여기서는 NOW() 기준으로 사용
              const updateFirstSql = `
                UPDATE members 
                SET first_purchase_at = 
                  IF(first_purchase_at IS NULL OR NOW() < first_purchase_at, NOW(), first_purchase_at) 
                WHERE id = ?
              `;
              connection.query(updateFirstSql, [user.id], (err8) => {
                if (err8) return connection.rollback(() => res.status(500).json({ error: 'first_purchase_at 갱신 실패' }));

                // 9. 커밋
                connection.commit(err7 => {
                  if (err7) return connection.rollback(() => res.status(500).json({ error: '커밋 실패' }));
                  res.json({ success: true, message: '상품이 구매되었습니다.' });
                });
              });
            });
          });
        });
      });
    });
  });
});

module.exports = router;
