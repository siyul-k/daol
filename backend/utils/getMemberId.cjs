
const connection = require('../db.cjs');

function getMemberId(username) {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT id FROM members WHERE username = ? LIMIT 1';
    connection.query(sql, [username], (err, results) => {
      if (err) return reject(err);
      if (results.length === 0) return reject(new Error('회원 없음'));
      resolve(results[0].id);
    });
  });
}

module.exports = getMemberId;
