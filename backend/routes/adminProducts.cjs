// ✅ 파일 위치: backend/routes/adminProducts.cjs
const express = require('express');
const router = express.Router();
const pool = require('../db.cjs');
const ExcelJS = require('exceljs');

// 상품 목록 조회
router.get('/', async (req, res) => {
  const { username, name, product_name, type, date } = req.query;

  let sql = `
    SELECT p.id, m.username, m.name, pk.name AS product_name, p.amount, p.pv,
           p.active, p.type,
           CONVERT_TZ(p.created_at, '+00:00', '+09:00') AS created_at
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
    sql += ' AND DATE(CONVERT_TZ(p.created_at, "+00:00", "+09:00")) = ?';
    params.push(date);
  }

  sql += ' ORDER BY p.created_at DESC';

  try {
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('❌ 상품 목록 조회 실패:', err);
    res.status(500).send('상품 조회 실패');
  }
});

// 상태 토글 (bcode만)
router.put('/:id/toggle', async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT active FROM purchases WHERE id = ? AND type = 'bcode'`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).send('상품을 찾을 수 없습니다.');
    }

    const current = rows[0].active;
    const next = current === 1 ? 0 : 1;

    await pool.query(
      `UPDATE purchases SET active = ? WHERE id = ?`,
      [next, id]
    );
    res.send('ok');
  } catch (err) {
    res.status(500).send('상태 변경 실패');
  }
});

// 상품 삭제 (포인트 복원 및 로그 기록 포함)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // 1. 삭제 대상 조회
    const [rows] = await pool.query(
      `
      SELECT p.amount, p.type, m.id AS member_id, m.username, m.point_balance
      FROM purchases p
      JOIN members m ON p.member_id = m.id
      WHERE p.id = ?
      `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).send('상품을 찾을 수 없습니다.');
    }

    const { amount, type, member_id, username, point_balance } = rows[0];

    if (type === 'normal') {
      // 2. point_balance 복원 (삭제 전 잔액 조회 → 복원 후 잔액 계산)
      const beforePoint = point_balance;
      const afterPoint = beforePoint + amount;

      await pool.query(
        `UPDATE members SET point_balance = point_balance + ? WHERE id = ?`,
        [amount, member_id]
      );

      // 3. point_logs 기록 (정확한 필드명/구조)
      await pool.query(
        `
        INSERT INTO point_logs (member_id, username, before_point, after_point, diff, reason, created_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW())
        `,
        [member_id, username, beforePoint, afterPoint, amount, '상품 삭제로 인한 포인트 복원']
      );
    }

    // 4. purchases 테이블에서 삭제
    await pool.query(
      `DELETE FROM purchases WHERE id = ?`,
      [id]
    );

    res.send('ok');
  } catch (err) {
    console.error('❌ 상품 삭제 실패:', err);
    res.status(500).send('삭제 실패');
  }
});

// 엑셀 다운로드
router.get('/export', async (req, res) => {
  const { username, name, product_name, type, date } = req.query;

  let sql = `
    SELECT p.id, m.username, m.name, pk.name AS product_name, p.amount, p.pv,
           p.active, p.type,
           CONVERT_TZ(p.created_at, '+00:00', '+09:00') AS created_at
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
    sql += ' AND DATE(CONVERT_TZ(p.created_at, "+00:00", "+09:00")) = ?';
    params.push(date);
  }

  sql += ' ORDER BY p.created_at DESC';

  try {
    const [rows] = await pool.query(sql, params);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('상품내역');

    // 순서: 번호, 등록일, 아이디, 이름, 상품명, 금액, PV, 상태, 타입
    sheet.columns = [
      { header: '번호', key: 'no', width: 8 },
      { header: '등록일', key: 'created_at', width: 20 },
      { header: '아이디', key: 'username', width: 15 },
      { header: '이름', key: 'name', width: 15 },
      { header: '상품명', key: 'product_name', width: 20 },
      { header: '금액', key: 'amount', width: 15 },
      { header: 'PV', key: 'pv', width: 15 },
      { header: '상태', key: 'active', width: 12 },
      { header: '타입', key: 'type', width: 12 },
    ];

    rows.forEach((row, idx) => {
      sheet.addRow({
        no: idx + 1,
        created_at: new Date(row.created_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
        username: row.username,
        name: row.name,
        product_name: row.product_name,
        amount: row.amount,
        pv: row.pv,
        active: row.active ? '승인완료' : '비활성화',
        type: row.type,
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=products.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('❌ 엑셀 데이터/생성 실패:', err);
    res.status(500).send('엑셀 조회 실패');
  }
});

module.exports = router;
