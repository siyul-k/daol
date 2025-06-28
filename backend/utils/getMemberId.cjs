const connection = require('../db.cjs');

/**
 * @param {string} username
 * @returns {Promise<number|null>}  // member_id or null
 */
async function getMemberId(username) {
  try {
    const [rows] = await connection.promise().query(
      'SELECT id FROM members WHERE username = ? LIMIT 1', [username]
    );
    if (!rows || rows.length === 0) return null;
    return rows[0].id;
  } catch (err) {
    throw new Error(`DB 조회 오류(getMemberId): ${err.message}`);
  }
}

module.exports = getMemberId;
