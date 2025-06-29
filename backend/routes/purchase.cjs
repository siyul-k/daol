// ✅ 파일 위치: backend/routes/purchase.cjs

const express = require('express');
const router = express.Router();
const pool = require('../db.cjs');

// ✅ 패키지 기반 구매 API (member_id 중심, 트랜잭션 적용)
router.post('/', async (req, res) => {
  const { username, package_id } = req.body;

  if (!username || !package_id) {
    return res.status(400).json({ error: 'username 및 package_id는 필요합니다.' });
  }

  let conn;
  try {
    conn = await pool.getConnection();

    // 1. 회원 정보 가져오기
    const [[user]] = await conn.query(
      'SELECT id, username, point_balance FROM members WHERE username = ?',
      [username]
    );
    if (!user) {
      return res.status(404).json({ error: '회원 없음' });
    }

    // 2. 패키지 정보 가져오기
    const [[pkg]] = await conn.query(
      'SELECT * FROM packages WHERE id = ?',
      [package_id]
    );
    if (!pkg) {
      return res.status(404).json({ error: '패키지 없음' });
    }
    const pkgType = pkg.type || 'normal';

    // 3. 포인트 부족 체크
    if (user.point_balance < pkg.price) {
      return res.status(400).json({ error: '포인트 부족' });
    }

    // 4. 트랜잭션 처리
    await conn.beginTransaction();

    // 5. 구매 등록
    const [purchaseResult] = await conn.query(
      `INSERT INTO purchases (member_id, package_id, amount, pv, type, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'approved', NOW())`,
      [user.id, pkg.id, pkg.price, pkg.pv, pkgType]
    );

    // 6. 구매 로그 (purchase_logs) 기록
    await conn.query(
      `INSERT INTO purchase_logs (member_id, username, package_id, amount, pv, type, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [user.id, user.username, pkg.id, pkg.price, pkg.pv, pkgType]
    );

    // 7. 포인트 차감
    await conn.query(
      'UPDATE members SET point_balance = point_balance - ? WHERE id = ?',
      [pkg.price, user.id]
    );

    // 8. 최초구매일(first_purchase_at) 업데이트
    await conn.query(
      `UPDATE members 
        SET first_purchase_at = 
          IF(first_purchase_at IS NULL OR NOW() < first_purchase_at, NOW(), first_purchase_at) 
        WHERE id = ?`,
      [user.id]
    );

    // 9. 커밋
    await conn.commit();
    res.json({ success: true, message: '상품이 구매되었습니다.' });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error('❌ 상품 구매 오류:', err);
    res.status(500).json({ error: '구매 중 서버 오류' });
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;
