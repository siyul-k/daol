// ✅ 파일 위치: backend/routes/pointAdjust.cjs

const express = require('express');
const router = express.Router();
const pool = require('../db.cjs');
const ExcelJS = require('exceljs');

// ✅ 전체 보정 목록 조회
router.get('/', async (req, res) => {
  const sql = `
    SELECT mp.id, mp.point, mp.description, mp.created_at,
           m.username, m.name
    FROM member_points mp
    LEFT JOIN members m ON mp.member_id = m.id
    ORDER BY mp.created_at DESC
  `;
  try {
    const [rows] = await pool.query(sql);
    res.json(rows);
  } catch (err) {
    console.error('❌ 보정 목록 조회 실패:', err);
    res.status(500).json({ error: '목록 조회 실패' });
  }
});

// ✅ 포인트 지급(보정) + 출금가능포인트 누적
router.post('/adjust', async (req, res) => {
  const { member_id, point, type, description } = req.body;
  console.log('📥 포인트 지급 요청:', { member_id, point, type, description });

  if (!member_id || isNaN(point)) {
    return res.status(400).json({ error: '필수값 누락 또는 금액 오류' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. 지급 로그(member_points)
    const [result] = await conn.query(
      `INSERT INTO member_points (member_id, point, type, description) VALUES (?, ?, ?, ?)`,
      [member_id, point, type, description]
    );

    // 2. 출금가능포인트 증가
    await conn.query(
      `UPDATE members SET withdrawable_point = withdrawable_point + ? WHERE id = ?`,
      [point, member_id]
    );

    // 3. 수당로그도 기록
    const [[userRow]] = await conn.query(
      `SELECT username FROM members WHERE id = ?`, [member_id]
    );
    if (userRow) {
      await conn.query(
        `INSERT INTO rewards_log (member_id, type, source, amount, memo, created_at)
         VALUES (?, 'adjust', ?, ?, ?, NOW())`,
        [
          member_id,
          result.insertId,
          point,
          description || '관리자 보정'
        ]
      );
    }

    await conn.commit();
    conn.release();
    console.log('✅ 포인트 지급 완료:', result.insertId);
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error('❌ 지급 실패:', err);
    res.status(500).json({ error: '포인트 지급 실패', details: err });
  }
});

// ✅ 지급(보정) 내역 삭제 + 출금가능포인트 복구
router.delete('/delete/:id', async (req, res) => {
  const id = req.params.id;
  const conn = await pool.getConnection();
  try {
    // 지급내역 조회
    const [[row]] = await conn.query(
      'SELECT member_id, point FROM member_points WHERE id = ?', [id]
    );
    if (!row) {
      conn.release();
      return res.status(404).json({ error: '내역이 존재하지 않습니다.' });
    }

    await conn.beginTransaction();

    // 지급내역 삭제
    await conn.query(
      'DELETE FROM member_points WHERE id = ?', [id]
    );
    // 포인트 차감(복구)
    await conn.query(
      'UPDATE members SET withdrawable_point = withdrawable_point - ? WHERE id = ?',
      [row.point, row.member_id]
    );

    await conn.commit();
    conn.release();
    console.log('🗑️ 삭제 완료:', id);
    res.json({ success: true });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error('❌ 삭제 실패:', err);
    res.status(500).json({ error: '삭제 실패', details: err });
  }
});

// ✅ 엑셀 다운로드 (동일)
router.get('/export', async (req, res) => {
  const sql = `
    SELECT mp.id, mp.point, mp.description, mp.created_at,
           m.username, m.name
    FROM member_points mp
    LEFT JOIN members m ON mp.member_id = m.id
    ORDER BY mp.created_at DESC
  `;
  try {
    const [rows] = await pool.query(sql);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('포인트 보정 내역');

    sheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: '아이디', key: 'username', width: 15 },
      { header: '이름', key: 'name', width: 15 },
      { header: '포인트', key: 'point', width: 12 },
      { header: '비고', key: 'description', width: 25 },
      { header: '일시', key: 'created_at', width: 20 },
    ];

    rows.forEach(row => sheet.addRow(row));

    const filename = `points_all_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('❌ 엑셀 다운로드 오류:', err);
    res.status(500).json({ error: '엑셀 다운로드 실패' });
  }
});

module.exports = router;
