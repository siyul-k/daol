// ✅ 파일명: scripts/fixRecommendLineage.cjs
const connection = require('../db.cjs');

async function updateAllRecommendLineage() {
  const [members] = await connection.promise().query('SELECT id, recommender_id FROM members');
  for (const m of members) {
    let ids = [];
    let current = m.recommender_id;
    for (let i = 0; i < 15; i++) { // 최대 15대
      if (!current) break;
      ids.push(current);
      const [[row]] = await connection.promise().query('SELECT recommender_id FROM members WHERE id = ?', [current]);
      current = row?.recommender_id || null;
    }
    // rec_1_id ~ rec_15_id 채우기
    const updateFields = Array.from({ length: 15 }, (_, idx) => `rec_${idx+1}_id = ${ids[idx] || 'NULL'}`).join(', ');
    await connection.promise().query(`UPDATE members SET ${updateFields} WHERE id = ?`, [m.id]);
  }
  console.log('✅ 전체 추천 계보(rec_1_id ~ rec_15_id) 갱신 완료');
  process.exit(0);
}

updateAllRecommendLineage();
