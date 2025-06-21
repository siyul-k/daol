// hash-generator.js
const bcrypt = require('bcrypt');

bcrypt.hash('1111', 10).then(hash => {
  console.log('✅ bcrypt 해시:', hash);
});
