// ✅ 파일 경로: backend/routes/pointAdjust.cjs
const express = require('express');
const router = express.Router();
const connection = require('../db.cjs');
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
    const [rows] = await connection.promise().query(sql);
    res.json(rows);
  } catch (err) {
    console.error('❌ 보정 목록 조회 실패:', err);
    res.status(500).json({ error: '목록 조회 실패' });
  }
});

// ✅ 포인트 지급
router.post('/adjust', async (req, res) => {
  const { member_id, point, type, description } = req.body;

  // ✅ 요청값 로깅
  console.log('📥 포인트 지급 요청:', { member_id, point, type, description });

  const sql = `
    INSERT INTO member_points (member_id, point, type, description)
    VALUES (?, ?, ?, ?)
  `;
  connection.query(sql, [member_id, point, type, description], async (err, result) => {
    if (err) {
      console.error('❌ DB 삽입 오류:', err);
      return res.status(500).json({ error: 'DB 오류', details: err });
    }

    try {
      const [userRows] = await connection.promise().query(
        'SELECT username FROM members WHERE id = ?', [member_id]
      );

      if (userRows.length > 0) {
        const username = userRows[0].username;

        const logSql = `
          INSERT INTO rewards_log (user_id, type, source, amount, memo, created_at)
          VALUES (?, 'adjust', ?, ?, ?, NOW())
        `;
        await connection.promise().query(logSql, [
          username,
          result.insertId,
          point,
          description || '관리자 보정'
        ]);
      }

      console.log('✅ 포인트 지급 완료:', result.insertId);
      res.json({ success: true });
    } catch (err) {
      console.error('❌ 로그 저장 오류:', err);
      res.status(500).json({ error: '지급은 되었지만 로그 기록 실패' });
    }
  });
});

// ✅ 삭제
router.delete('/delete/:id', (req, res) => {
  const id = req.params.id;
  connection.query('DELETE FROM member_points WHERE id = ?', [id], (err, result) => {
    if (err) {
      console.error('❌ 삭제 실패:', err);
      return res.status(500).json({ error: '삭제 실패', details: err });
    }
    console.log('🗑️ 삭제 완료:', id);
    res.json({ success: true });
  });
});

// ✅ 엑셀 다운로드
router.get('/export', async (req, res) => {
  const sql = `
    SELECT mp.id, mp.point, mp.description, mp.created_at,
           m.username, m.name
    FROM member_points mp
    LEFT JOIN members m ON mp.member_id = m.id
    ORDER BY mp.created_at DESC
  `;
  try {
    const [rows] = await connection.promise().query(sql);
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
