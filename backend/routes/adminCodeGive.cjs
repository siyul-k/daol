// ✅ 파일 경로: backend/routes/adminCodeGive.cjs
const express = require('express');
const router = express.Router();
const connection = require('../db.cjs');

// ✅ 지급 내역 전체 조회 (검색 + 페이징)
router.get('/', (req, res) => {
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

  // 1️⃣ 총 개수 먼저 조회
  connection.query(countSql, params, (err, countResult) => {
    if (err) {
      console.error('총 개수 조회 실패:', err);
      return res.status(500).send('조회 실패');
    }

    const total = countResult[0].total;

    // 2️⃣ 데이터 조회
    connection.query(dataSql, [...params, parseInt(limit), offset], (err2, rows) => {
      if (err2) {
        console.error('코드 지급 내역 조회 실패:', err2);
        return res.status(500).send('조회 실패');
      }
      res.json({ rows, total });
    });
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

// ✅ 코드지급 등록 → purchases 테이블에 추가 (최초구매일 갱신 포함)
router.post('/', (req, res) => {
  const { username, product_id } = req.body;

  // 1. username으로 member_id 조회
  connection.query(
    'SELECT id FROM members WHERE username = ?',
    [username],
    (err, memberRows) => {
      if (err) return res.status(500).send('회원 정보 조회 실패');
      if (memberRows.length === 0) return res.status(404).send('회원 없음');

      const member_id = memberRows[0].id;

      // 2. 상품정보 조회
      connection.query(
        'SELECT price, pv FROM packages WHERE id = ? AND type = "bcode"',
        [product_id],
        (err2, packageRows) => {
          if (err2) return res.status(500).send('상품 정보 조회 실패');
          if (packageRows.length === 0) return res.status(404).send('상품 없음');

          const { price, pv } = packageRows[0];

          // 3. 지급 등록 (member_id, product_id)
          const insertSql = `
            INSERT INTO purchases (member_id, package_id, amount, pv, status, type, active)
            VALUES (?, ?, ?, ?, 'approved', 'bcode', 1)
          `;
          connection.query(insertSql, [member_id, product_id, price, pv], (err3) => {
            if (err3) return res.status(500).send('지급 실패');

            // 4. 최초구매일 갱신 (최초일 때만)
            const updateSql = `
              UPDATE members
              SET first_purchase_at = IF(first_purchase_at IS NULL, NOW(), first_purchase_at)
              WHERE id = ?
            `;
            connection.query(updateSql, [member_id], (err4) => {
              if (err4) return res.status(500).send('최초구매일 갱신 실패');
              res.send('ok');
            });
          });
        }
      );
    }
  );
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

// ✅ 지급 상태(활성/비활성) 토글
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
