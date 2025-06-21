// ✅ 파일 경로: backend/routes/adminProducts.cjs
const express = require('express');
const router = express.Router();
const connection = require('../db.cjs');
const ExcelJS = require('exceljs');

// ✅ 상품 목록 조회
router.get('/', (req, res) => {
  const { username, name, product_name, type, date } = req.query;

  let sql = `
    SELECT p.id, m.username, m.name, pk.name AS product_name, p.amount, p.pv,
           p.active, p.type, p.created_at
    FROM purchases p
    JOIN members m ON p.member_id = m.id
    JOIN packages pk ON p.package_id = pk.id
    WHERE 1 = 1
  `;
  const params = [];

  if (username) {
    sql += ' AND m.username LIKE ?';
    params.push(`%${username}%`);
  }
  if (name) {
    sql += ' AND m.name LIKE ?';
    params.push(`%${name}%`);
  }
  if (product_name) {
    sql += ' AND pk.name LIKE ?';
    params.push(`%${product_name}%`);
  }
  if (type) {
    sql += ' AND p.type = ?';
    params.push(type);
  }
  if (date) {
    sql += ' AND DATE(p.created_at) = ?';
    params.push(date);
  }

  sql += ' ORDER BY p.created_at DESC';

  connection.query(sql, params, (err, rows) => {
    if (err) {
      console.error('❌ 상품 목록 조회 실패:', err);
      return res.status(500).send('상품 조회 실패');
    }
    res.json(rows);
  });
});

// ✅ 상태 토글 (active 기준으로 통일)
router.put('/:id/toggle', (req, res) => {
  const { id } = req.params;

  const getSql = `SELECT active FROM purchases WHERE id = ? AND type = 'bcode'`;
  connection.query(getSql, [id], (err, rows) => {
    if (err || rows.length === 0) {
      return res.status(404).send('상품을 찾을 수 없습니다.');
    }

    const current = rows[0].active;
    const next = current === 1 ? 0 : 1;

    const updateSql = `UPDATE purchases SET active = ? WHERE id = ?`;
    connection.query(updateSql, [next, id], (err2) => {
      if (err2) return res.status(500).send('상태 변경 실패');
      res.send('ok');
    });
  });
});

// ✅ 상품 삭제 (일반상품일 경우 포인트 복원 처리 포함)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // 1. 삭제 대상 조회
    const [rows] = await connection.promise().query(
      `
      SELECT p.amount, p.type, m.username
      FROM purchases p
      JOIN members m ON p.member_id = m.id
      WHERE p.id = ?
      `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).send('상품을 찾을 수 없습니다.');
    }

    const { amount, type, username } = rows[0];

    if (type === 'normal') {
      // 2. point_balance 복원
      await connection.promise().query(
        `UPDATE members SET point_balance = point_balance + ? WHERE username = ?`,
        [amount, username]
      );

      // 3. 복원 로그 기록
      await connection.promise().query(
        `
        INSERT INTO member_points (username, amount, type, reason)
        VALUES (?, ?, 'add', '상품 삭제로 포인트 복원')
        `,
        [username, amount]
      );
    }

    // 4. purchases 테이블에서 삭제
    await connection.promise().query(
      `DELETE FROM purchases WHERE id = ?`,
      [id]
    );

    res.send('ok');
  } catch (err) {
    console.error('❌ 상품 삭제 실패:', err);
    res.status(500).send('삭제 실패');
  }
});


// ✅ 엑셀 다운로드
router.get('/export', async (req, res) => {
  const { username, name, product_name, type, date } = req.query;

  let sql = `
    SELECT p.id, m.username, m.name, pk.name AS product_name, p.amount, p.pv,
           p.active, p.type, p.created_at
    FROM purchases p
    JOIN members m ON p.member_id = m.id
    JOIN packages pk ON p.package_id = pk.id
    WHERE 1 = 1
  `;
  const params = [];

  if (username) {
    sql += ' AND m.username LIKE ?';
    params.push(`%${username}%`);
  }
  if (name) {
    sql += ' AND m.name LIKE ?';
    params.push(`%${name}%`);
  }
  if (product_name) {
    sql += ' AND pk.name LIKE ?';
    params.push(`%${product_name}%`);
  }
  if (type) {
    sql += ' AND p.type = ?';
    params.push(type);
  }
  if (date) {
    sql += ' AND DATE(p.created_at) = ?';
    params.push(date);
  }

  sql += ' ORDER BY p.created_at DESC';

  connection.query(sql, params, async (err, rows) => {
    if (err) {
      console.error('❌ 엑셀 데이터 조회 실패:', err);
      return res.status(500).send('엑셀 조회 실패');
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('상품내역');

    sheet.columns = [
      { header: '아이디', key: 'username', width: 15 },
      { header: '이름', key: 'name', width: 15 },
      { header: '상품명', key: 'product_name', width: 20 },
      { header: '금액', key: 'amount', width: 15 },
      { header: 'PV', key: 'pv', width: 15 },
      { header: '상태', key: 'active', width: 12 },
      { header: '타입', key: 'type', width: 12 },
      { header: '등록일', key: 'created_at', width: 20 },
    ];

    rows.forEach((row) => {
      sheet.addRow({
        ...row,
        active: row.active ? '승인완료' : '비활성화',
        created_at: new Date(row.created_at).toLocaleString('ko-KR'),
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=products.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  });
});

module.exports = router;
