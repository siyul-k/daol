// ✅ 파일 경로: backend/routes/adminCodeGive.cjs
const express = require('express');
const router = express.Router();
const connection = require('../db.cjs');

// ✅ 지급 내역 전체 조회 (검색 필터 포함)
router.get('/', (req, res) => {
  const { username, name } = req.query;

  let where = "WHERE p.type = 'bcode'";
  const params = [];

  if (username) {
    where += ' AND m.username LIKE ?';
    params.push(`%${username}%`);
  }
  if (name) {
    where += ' AND m.name LIKE ?';
    params.push(`%${name}%`);
  }

  const sql = `
    SELECT p.id, m.username, m.name, pk.name AS product_name, p.amount, p.pv, p.status, p.active, p.created_at
    FROM purchases p
    JOIN members m ON p.member_id = m.id
    JOIN packages pk ON p.package_id = pk.id
    ${where}
    ORDER BY p.created_at DESC
  `;

  connection.query(sql, params, (err, rows) => {
    if (err) {
      console.error('코드 지급 내역 조회 실패:', err);
      return res.status(500).send('조회 실패');
    }
    res.json(rows);
  });
});

// ✅ 상품 목록 (B코드만)
router.get('/products', (req, res) => {
  const sql = `SELECT id, name, price FROM packages WHERE type = 'bcode'`;
  connection.query(sql, (err, rows) => {
    if (err) {
      console.error('상품 목록 조회 실패:', err);
      return res.status(500).send('상품 조회 실패');
    }
    res.json(rows);
  });
});

// ✅ 아이디 확인 (이름 반환)
router.get('/check-username/:username', (req, res) => {
  const { username } = req.params;
  connection.query(
    'SELECT id, name FROM members WHERE username = ?',
    [username],
    (err, rows) => {
      if (err) {
        console.error('아이디 조회 실패:', err);
        return res.status(500).send('서버 오류');
      }
      if (rows.length === 0) return res.status(404).send('존재하지 않음');
      res.json({ member_id: rows[0].id, name: rows[0].name });
    }
  );
});

// ✅ 코드지급 등록 → purchases 테이블에 추가
router.post('/', (req, res) => {
  const { username, product_id } = req.body;

  const memberQuery = `SELECT id FROM members WHERE username = ?`;
  const packageQuery = `SELECT price, pv FROM packages WHERE id = ?`;

  connection.query(memberQuery, [username], (err, memberRows) => {
    if (err || memberRows.length === 0) {
      console.error('회원 조회 실패:', err);
      return res.status(400).send('회원 정보 조회 실패');
    }

    const member_id = memberRows[0].id;

    connection.query(packageQuery, [product_id], (err2, packageRows) => {
      if (err2 || packageRows.length === 0) {
        console.error('상품 조회 실패:', err2);
        return res.status(400).send('상품 정보 조회 실패');
      }

      const { price, pv } = packageRows[0];

      const insertSql = `
        INSERT INTO purchases (member_id, package_id, amount, pv, status, type, active)
        VALUES (?, ?, ?, ?, 'approved', 'bcode', 1)
      `;
      connection.query(insertSql, [member_id, product_id, price, pv], (err3) => {
        if (err3) {
          console.error('구매 등록 실패:', err3);
          return res.status(500).send('지급 실패');
        }
        res.send('ok');
      });
    });
  });
});

// ✅ 지급 내역 삭제
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const sql = `DELETE FROM purchases WHERE id = ? AND type = 'bcode'`;
  connection.query(sql, [id], (err) => {
    if (err) {
      console.error('삭제 실패:', err);
      return res.status(500).send('삭제 실패');
    }
    res.send('ok');
  });
});

// ✅ 지급 상태(활성/비활성) 토글 (수정용)
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { active } = req.body;

  const sql = `UPDATE purchases SET active = ? WHERE id = ? AND type = 'bcode'`;
  connection.query(sql, [active, id], (err) => {
    if (err) {
      console.error('상태 수정 실패:', err);
      return res.status(500).send('수정 실패');
    }
    res.send('ok');
  });
});

module.exports = router;
