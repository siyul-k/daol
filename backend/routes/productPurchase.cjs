// ✅ 파일 위치: backend/routes/productPurchase.cjs

const express = require('express');
const router = express.Router();
const pool = require('../db.cjs');

// ✅ 패키지 기반 상품 구매 API (member_id 기준)
router.post('/', async (req, res) => {
  const { username, package_id } = req.body;

  if (!username || !package_id) {
    return res.status(400).json({ error: 'username과 package_id는 필수입니다.' });
  }

  const conn = await pool.getConnection();
  try {
    // 1. 회원 정보 가져오기
    const [userResult] = await conn.query(
      'SELECT id, username, point_balance FROM members WHERE username = ?',
      [username]
    );
    if (userResult.length === 0) {
      conn.release();
      return res.status(404).json({ error: '회원 없음' });
    }
    const user = userResult[0];

    // 2. 패키지 정보 가져오기
    const [pkgResult] = await conn.query(
      'SELECT * FROM packages WHERE id = ?',
      [package_id]
    );
    if (pkgResult.length === 0) {
      conn.release();
      return res.status(404).json({ error: '패키지 없음' });
    }
    const pkg = pkgResult[0];
    const pkgType = pkg.type || 'normal';

    // 3. 포인트 부족 확인
    if (user.point_balance < pkg.price) {
      conn.release();
      return res.status(400).json({ error: '포인트 부족' });
    }

    // 4. 트랜잭션 시작
    await conn.beginTransaction();

    // 5. 구매 기록 저장 (member_id 기반)
    const insertSql = `
      INSERT INTO purchases (member_id, package_id, amount, pv, type, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'approved', NOW())
    `;
    await conn.query(
      insertSql,
      [user.id, pkg.id, pkg.price, pkg.pv, pkgType]
    );

    // 6. 구매 로그 기록 (member_id O)
    const logSql = `
      INSERT INTO purchase_logs (member_id, package_id, amount, pv, type, created_at)
      VALUES (?, ?, ?, ?, ?, NOW())
    `;
    await conn.query(
      logSql,
      [user.id, pkg.id, pkg.price, pkg.pv, pkgType]
    );

    // 7. 포인트 차감
    const updateSql = `
      UPDATE members SET point_balance = point_balance - ? WHERE id = ?
    `;
    await conn.query(updateSql, [pkg.price, user.id]);

    // 8. 최초구매일(first_purchase_at) 업데이트 (처음 구매일만 갱신)
    const updateFirstSql = `
      UPDATE members 
      SET first_purchase_at = 
        IF(first_purchase_at IS NULL OR NOW() < first_purchase_at, NOW(), first_purchase_at) 
      WHERE id = ?
    `;
    await conn.query(updateFirstSql, [user.id]);

    // 9. 커밋
    await conn.commit();
    conn.release();

    res.json({ success: true, message: '구매 완료' });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error('❌ 구매 트랜잭션 오류:', err);
    res.status(500).json({ error: '구매 처리 중 오류', details: err.message });
  }
});

module.exports = router;
