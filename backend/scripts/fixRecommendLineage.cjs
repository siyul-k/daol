// ✅ 파일 경로: backend/scripts/fixRecommendLineage.cjs
const pool = require('../db.cjs');

/**
 * 전체 회원의 rec_1_id ~ rec_{limitDepth}_id 갱신
 * - 메모리 맵으로 추적하여 DB 왕복 최소화
 * - 사이클(순환추천) 가드
 * - 기본 깊이 5 (정산은 1~5대만 사용)
 */
async function updateAllRecommendLineage(limitDepth = 5, chunkSize = 1000) {
  const conn = await pool.getConnection(); // 풀에서 단일 커넥션 획득
  try {
    // 1) 전체 맵 로드 (트랜잭션 커넥션 사용)
    const [rows] = await conn.query(
      'SELECT id, recommender_id FROM members'
    );
    const parent = new Map(rows.map(r => [r.id, r.recommender_id || null]));

    // 2) 트랜잭션 시작
    await conn.beginTransaction();

    let batch = [];
    for (const { id } of rows) {
      const lineage = [];
      const seen = new Set([id]);

      let cur = parent.get(id) || null;
      for (let d = 0; d < limitDepth && cur; d++) {
        if (seen.has(cur)) { // 사이클 감지
          console.warn(`⚠️ cycle detected: member ${id} -> ${cur}`);
          break;
        }
        lineage.push(cur);
        seen.add(cur);
        cur = parent.get(cur) || null;
      }

      const fields = Array
        .from({ length: limitDepth }, (_, i) => `rec_${i + 1}_id = ${lineage[i] ?? 'NULL'}`)
        .join(', ');

      batch.push({ id, sql: `UPDATE members SET ${fields} WHERE id = ?` });

      // 청크 단위 실행
      if (batch.length >= chunkSize) {
        for (const q of batch) await conn.query(q.sql, [q.id]);
        batch = [];
      }
    }
    // 잔여 실행
    for (const q of batch) await conn.query(q.sql, [q.id]);

    await conn.commit();
    console.log(`✅ 추천 계보(rec_1_id ~ rec_${limitDepth}_id) 갱신 완료 (members: ${rows.length})`);
  } catch (e) {
    try { await conn.rollback(); } catch (_) {}
    console.error('❌ 계보 갱신 실패:', e);
    throw e;
  } finally {
    conn.release(); // 커넥션 반환
  }
}

module.exports = { updateAllRecommendLineage };
