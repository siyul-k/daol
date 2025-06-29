// ✅ 파일 경로: backend/routes/adminCodeGive.cjs
const express = require('express');
const router = express.Router();
const pool = require('../db.cjs');

// ✅ 지급 내역 전체 조회 (검색 + 페이징)
router.get('/', async (req, res) => {
  const { username, name, page = 1, limit = 10 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let where = `WHERE p.type = 'bcode'`;
  const params = [];

  if (username) {
    where += ' AND m.username LIKE ?';
    params.push(`%${username}%`);
  }
  if (name) {
    where += ' AND m.name LIKE ?';
    params.push(`%${name}%`);
  }

  const countSql = `
    SELECT COUNT(*) AS total
    FROM purchases p
    JOIN members m ON p.member_id = m.id
    ${where}
  `;

  const dataSql = `
    SELECT p.id, m.username, m.name, pk.name AS product_name, p.amount, p.pv, p.status, p.active, p.created_at
    FROM purchases p
    JOIN members m ON p.member_id = m.id
    JOIN packages pk ON p.package_id = pk.id
    ${where}
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `;

  try {
    // 1️⃣ 총 개수 먼저 조회
    const [countResult] = await pool.query(countSql, params);
    const total = countResult[0]?.total || 0;

    // 2️⃣ 데이터 조회
    const [rows] = await pool.query(dataSql, [...params, parseInt(limit), offset]);
    res.json({ rows, total });
  } catch (err) {
    console.error('코드 지급 내역 조회 실패:', err);
    res.status(500).send('조회 실패');
  }
});

// ✅ 상품 목록 (B코드만)
router.get('/products', async (req, res) => {
  const sql = `SELECT id, name, price FROM packages WHERE type = 'bcode'`;
  try {
    const [rows] = await pool.query(sql);
    res.json(rows);
  } catch (err) {
    console.error('상품 목록 조회 실패:', err);
    res.status(500).send('상품 조회 실패');
  }
});

// ✅ 아이디 확인 (이름 반환)
router.get('/check-username/:username', async (req, res) => {
  const { username } = req.params;
  try {
    const [rows] = await pool.query(
      'SELECT id, name FROM members WHERE username = ?',
      [username]
    );
    if (rows.length === 0) return res.status(404).send('존재하지 않음');
    res.json({ member_id: rows[0].id, name: rows[0].name });
  } catch (err) {
    console.error('아이디 조회 실패:', err);
    res.status(500).send('서버 오류');
  }
});

// ✅ 코드지급 등록 → purchases 테이블에 추가 (최초구매일 갱신 포함)
router.post('/', async (req, res) => {
  const { username, product_id } = req.body;

  try {
    // 1. username으로 member_id 조회
    const [memberRows] = await pool.query(
      'SELECT id FROM members WHERE username = ?',
      [username]
    );
    if (memberRows.length === 0) return res.status(404).send('회원 없음');
    const member_id = memberRows[0].id;

    // 2. 상품정보 조회
    const [packageRows] = await pool.query(
      'SELECT price, pv FROM packages WHERE id = ? AND type = "bcode"',
      [product_id]
    );
    if (packageRows.length === 0) return res.status(404).send('상품 없음');
    const { price, pv } = packageRows[0];

    // 3. 지급 등록 (member_id, product_id)
    const insertSql = `
      INSERT INTO purchases (member_id, package_id, amount, pv, status, type, active)
      VALUES (?, ?, ?, ?, 'approved', 'bcode', 1)
    `;
    await pool.query(insertSql, [member_id, product_id, price, pv]);

    // 4. 최초구매일 갱신 (최초일 때만)
    const updateSql = `
      UPDATE members
      SET first_purchase_at = IF(first_purchase_at IS NULL, NOW(), first_purchase_at)
      WHERE id = ?
    `;
    await pool.query(updateSql, [member_id]);
    res.send('ok');
  } catch (err) {
    console.error('코드 지급 등록 오류:', err);
    res.status(500).send('지급 실패');
  }
});

// ✅ 지급 내역 삭제
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const sql = `DELETE FROM purchases WHERE id = ? AND type = 'bcode'`;
  try {
    await pool.query(sql, [id]);
    res.send('ok');
  } catch (err) {
    console.error('삭제 실패:', err);
    res.status(500).send('삭제 실패');
  }
});

// ✅ 지급 상태(활성/비활성) 토글
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { active } = req.body;

  const sql = `UPDATE purchases SET active = ? WHERE id = ? AND type = 'bcode'`;
  try {
    await pool.query(sql, [active, id]);
    res.send('ok');
  } catch (err) {
    console.error('상태 수정 실패:', err);
    res.status(500).send('수정 실패');
  }
});

module.exports = router;
