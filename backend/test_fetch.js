const jwt = require('jsonwebtoken');
const token = jwt.sign({ id: "00000000-0000-0000-0000-000000000001", email: "sushil@invictus.com", role: "admin" }, 'supersecretjwtkey_for_igt_os_final', { expiresIn: '24h' });
console.log(token);
