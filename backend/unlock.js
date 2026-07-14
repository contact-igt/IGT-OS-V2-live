const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});
async function unlock() {
  await pool.query("UPDATE public.users SET failed_login_attempts = 0, locked_until = NULL;");
  console.log("All accounts unlocked");
  process.exit(0);
}
unlock();
