// ✅ 파일 위치: backend/routes/adminCenters.cjs
const express = require('express');
const router = express.Router();
const connection = require('../db.cjs');

// ✅ 센터 전체 조회 (센터장 + 추천자 이름 포함)
router.get('/', (req, res) => {
  const sql = `
    SELECT 
      c.id,
      c.center_name AS name,
      c.center_owner AS leader_username,
      c.center_recommender AS recommender_username,
      owner.name AS leader_name,
      recommender.name AS recommender_name,
      c.created_at
    FROM centers c
    LEFT JOIN members owner 
      ON c.center_owner COLLATE utf8mb4_unicode_ci = owner.username
    LEFT JOIN members recommender 
      ON c.center_recommender COLLATE utf8mb4_unicode_ci = recommender.username
    ORDER BY c.created_at DESC
  `;
  connection.query(sql, (err, results) => {
    if (err) {
      console.error('센터 목록 조회 오류:', err);
      return res.status(500).json({ error: '센터 목록 불러오기 실패' });
    }
    res.json(results);
  });
});

// ✅ 센터 등록
router.post('/', (req, res) => {
  const { center_name, center_owner, center_recommender } = req.body;
  const sql = `
    INSERT INTO centers (center_name, center_owner, center_recommender)
    VALUES (?, ?, ?)
  `;
  connection.query(sql, [center_name, center_owner, center_recommender], (err) => {
    if (err) {
      console.error('센터 등록 실패:', err);
      return res.status(500).json({ error: '센터 등록 실패' });
    }
    res.json({ message: '센터 등록 완료' });
  });
});

// ✅ 센터명 중복 확인
router.post('/check-duplicate-name', (req, res) => {
  const { name } = req.body;
  const sql = `SELECT COUNT(*) AS cnt FROM centers WHERE center_name = ?`;
  connection.query(sql, [name], (err, results) => {
    if (err) return res.status(500).json({ error: 'DB Error' });
    res.json({ exists: results[0].cnt > 0 });
  });
});

// ✅ 센터장/추천자 이름 조회
router.get('/member-name/:username', (req, res) => {
  const { username } = req.params;
  const sql = `SELECT name FROM members WHERE username = ?`;
  connection.query(sql, [username], (err, results) => {
    if (err) return res.status(500).json({ error: 'DB Error' });
    if (results.length === 0) return res.status(404).json({ error: '회원 없음' });
    res.json({ name: results[0].name });
  });
});

// ✅ 센터 수정
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { center_name, center_owner, center_recommender } = req.body;

  const checkSql = `
    SELECT 
      (SELECT COUNT(*) FROM members WHERE username = ?) AS owner_exists,
      (SELECT COUNT(*) FROM members WHERE username = ?) AS recommender_exists
  `;
  connection.query(checkSql, [center_owner, center_recommender], (err, result) => {
    if (err) return res.status(500).json({ error: '회원 확인 오류' });

    const { owner_exists } = result[0];
    if (owner_exists === 0) {
      return res.status(400).json({ error: '존재하지 않는 센터장 ID입니다.' });
    }

    const updateSql = `
      UPDATE centers
      SET center_name = ?, center_owner = ?, center_recommender = ?
      WHERE id = ?
    `;
    connection.query(updateSql, [center_name, center_owner, center_recommender, id], (err2) => {
      if (err2) return res.status(500).json({ error: '센터 수정 실패' });
      res.json({ message: '센터 수정 완료' });
    });
  });
});

// ✅ 센터 삭제
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  const getNameSql = `SELECT center_name FROM centers WHERE id = ? LIMIT 1`;
  connection.query(getNameSql, [id], (err, result) => {
    if (err || result.length === 0) return res.status(400).json({ error: '센터 조회 실패' });

    const centerName = result[0].center_name;
    const checkSql = `SELECT COUNT(*) AS cnt FROM members WHERE center = ?`;
    connection.query(checkSql, [centerName], (err2, result2) => {
      if (err2) return res.status(500).json({ error: '사용중 여부 확인 실패' });

      if (result2[0].cnt > 0) {
        return res.status(400).json({ error: '해당 센터를 사용하는 회원이 있어 삭제할 수 없습니다.' });
      }

      const deleteSql = `DELETE FROM centers WHERE id = ?`;
      connection.query(deleteSql, [id], (err3) => {
        if (err3) return res.status(500).json({ error: '센터 삭제 실패' });
        res.json({ message: '센터 삭제 완료' });
      });
    });
  });
});

// ✅ 센터명으로 센터장의 이름 조회
router.get('/get-center-owner-name', (req, res) => {
  const { center } = req.query;

  const sql = `
    SELECT m.name
    FROM centers c
    LEFT JOIN members m ON c.center_owner COLLATE utf8mb4_unicode_ci = m.username
    WHERE c.center_name = ?
    LIMIT 1
  `;

  connection.query(sql, [center], (err, results) => {
    if (err) {
      console.error('센터장 이름 조회 오류:', err);
      return res.status(500).json({ success: false, message: 'DB 오류' });
    }

    if (results.length === 0 || !results[0].name) {
      return res.json({ success: false, message: '센터장 없음' });
    }

    res.json({ success: true, name: results[0].name });
  });
});


module.exports = router;
