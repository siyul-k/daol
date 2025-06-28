// ✅ 파일 위치: backend/routes/adminCenters.cjs
const express = require('express');
const router = express.Router();
const connection = require('../db.cjs');

// 하위 추천 회원 전부 조회 (id 기준)
async function getAllDescendantIds(ownerId) {
  const descendants = new Set();
  const queue = [ownerId];
  while (queue.length > 0) {
    const currentId = queue.shift();
    const [rows] = await connection.promise().query(
      'SELECT id FROM members WHERE recommender_id = ?',
      [currentId]
    );
    for (const row of rows) {
      if (!descendants.has(row.id)) {
        descendants.add(row.id);
        queue.push(row.id);
      }
    }
  }
  return [...descendants];
}

// ✅ 센터 전체 조회 (센터장/추천인 id, username, name)
router.get('/', async (req, res) => {
  const sql = `
    SELECT 
      c.id,
      c.center_name AS name,
      c.center_owner_id,
      owner.username AS leader_username,
      owner.name AS leader_name,
      c.center_recommender_id,
      recommender.username AS recommender_username,
      recommender.name AS recommender_name,
      c.center_phone,
      c.created_at
    FROM centers c
    LEFT JOIN members owner ON c.center_owner_id = owner.id
    LEFT JOIN members recommender ON c.center_recommender_id = recommender.id
    ORDER BY c.created_at DESC
  `;
  try {
    const [results] = await connection.promise().query(sql);
    res.json(results);
  } catch (err) {
    console.error('센터 목록 조회 오류:', err);
    res.status(500).json({ error: '센터 목록 불러오기 실패' });
  }
});

// username → member_id 변환
router.get('/member-id-by-username/:username', async (req, res) => {
  const { username } = req.params;
  const [[row]] = await connection.promise().query(
    'SELECT id FROM members WHERE username = ? LIMIT 1', [username]
  );
  if (!row) return res.status(404).json({ error: '회원 없음' });
  res.json({ id: row.id });
});

// ✅ 센터 등록 (center_id 연동 구조)
router.post('/', async (req, res) => {
  let { center_name, center_owner, center_recommender, center_phone = '' } = req.body;

  // member_id 입력이 username이면 변환
  async function ensureId(val) {
    if (!val) return null;
    if (/^\d+$/.test(val)) return val;
    const [[row] = []] = await connection.promise().query('SELECT id FROM members WHERE username = ?', [val]);
    return row ? row.id : null;
  }

  center_owner = await ensureId(center_owner);
  center_recommender = await ensureId(center_recommender);

  if (!center_owner) return res.status(400).json({ error: '센터장(id) 필수' });

  try {
    // 센터 등록
    const insertSql = `
      INSERT INTO centers (center_name, center_owner_id, center_recommender_id, center_phone)
      VALUES (?, ?, ?, ?)
    `;
    const [insertResult] = await connection.promise().query(insertSql, [
      center_name,
      center_owner,
      center_recommender || null,
      center_phone,
    ]);
    const newCenterId = insertResult.insertId;

    // 센터장 하위 추천계보 조회 (id 기준)
    const descendants = await getAllDescendantIds(center_owner);
    descendants.push(center_owner);

    // 하위 회원들의 center_id 업데이트 (배정/변경)
    if (descendants.length > 0) {
      await connection.promise().query(
        `UPDATE members SET center_id = ? WHERE id IN (?)`,
        [newCenterId, descendants]
      );
    }

    res.json({ message: '센터 등록 및 자동 배정 완료' });
  } catch (err) {
    console.error('센터 등록 실패:', err);
    res.status(500).json({ error: '센터 등록 실패' });
  }
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

// ✅ 센터장/추천자 이름(id→username, name) 조회
router.get('/member-name/:id', (req, res) => {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) return res.status(400).json({ error: '숫자 member_id만 허용' });
  const sql = `SELECT username, name FROM members WHERE id = ?`;
  connection.query(sql, [id], (err, results) => {
    if (err) return res.status(500).json({ error: 'DB Error' });
    if (results.length === 0) return res.status(404).json({ error: '회원 없음' });
    res.json({ username: results[0].username, name: results[0].name });
  });
});

// ✅ 센터 수정 (center_id 연동)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  let { center_name, center_owner, center_recommender, center_phone } = req.body;

  async function ensureId(val) {
    if (!val) return null;
    if (/^\d+$/.test(val)) return val;
    const [[row] = []] = await connection.promise().query('SELECT id FROM members WHERE username = ?', [val]);
    return row ? row.id : null;
  }

  center_owner = await ensureId(center_owner);
  center_recommender = await ensureId(center_recommender);

  try {
    const updateSql = `
      UPDATE centers
      SET center_name = ?, center_owner_id = ?, center_recommender_id = ?, center_phone = ?
      WHERE id = ?
    `;
    await connection.promise().query(updateSql, [
      center_name,
      center_owner,
      center_recommender || null,
      center_phone,
      id,
    ]);
    // (선택) 센터장/추천계보 하위회원의 center_id도 변경하려면 여기에 추가

    res.json({ message: '센터 수정 완료' });
  } catch (err) {
    console.error('센터 수정 실패:', err);
    res.status(500).json({ error: '센터 수정 실패' });
  }
});

// ✅ 센터 삭제 (center_id 기준)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  // members에 center_id가 배정된 회원이 있으면 삭제 불가
  const [[check]] = await connection.promise().query(
    `SELECT COUNT(*) AS cnt FROM members WHERE center_id = ?`, [id]
  );
  if (check.cnt > 0) {
    return res.status(400).json({ error: '해당 센터를 사용하는 회원이 있어 삭제할 수 없습니다.' });
  }
  // 센터 삭제
  await connection.promise().query(`DELETE FROM centers WHERE id = ?`, [id]);
  res.json({ message: '센터 삭제 완료' });
});

// ✅ 센터명으로 센터장 이름(id 기반)
router.get('/get-center-owner-name', async (req, res) => {
  const { center } = req.query;
  const sql = `
    SELECT m.name
    FROM centers c
    LEFT JOIN members m ON c.center_owner_id = m.id
    WHERE c.center_name = ?
    LIMIT 1
  `;
  const [results] = await connection.promise().query(sql, [center]);
  if (results.length === 0 || !results[0].name) {
    return res.json({ success: false, message: '센터장 없음' });
  }
  res.json({ success: true, name: results[0].name });
});

module.exports = router;
