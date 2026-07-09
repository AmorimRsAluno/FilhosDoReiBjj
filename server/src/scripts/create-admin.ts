import bcrypt from "bcryptjs";
import { pool } from "../db.js";

async function main() {
  const name = process.env.INITIAL_ADMIN_NAME ?? "Admin";
  const username = process.env.INITIAL_ADMIN_USERNAME ?? "Admin";
  const email = (process.env.INITIAL_ADMIN_EMAIL ?? "admin@filhosdorei.local").toLowerCase();
  const password = process.env.INITIAL_ADMIN_PASSWORD ?? "Admin@2026";

  if (!email || !password || password.length < 8) {
    throw new Error("Configure INITIAL_ADMIN_EMAIL e INITIAL_ADMIN_PASSWORD com pelo menos 8 caracteres.");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    `INSERT INTO users (name, username, email, password_hash, role, avatar_url)
     VALUES ($1, $2, $3, $4, 'admin', $5)
     ON CONFLICT (email)
     DO UPDATE SET name = EXCLUDED.name, username = EXCLUDED.username, password_hash = EXCLUDED.password_hash, role = 'admin'
     RETURNING id, name, username, email, role`,
    [name, username, email, passwordHash, `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}`]
  );

  const permissions = ["dashboard", "students", "finance", "plans", "attendance", "techniques", "ranking", "store", "competitions", "users", "registrations"];
  await pool.query("DELETE FROM user_permissions WHERE user_id = $1", [result.rows[0].id]);
  for (const permission of permissions) {
    await pool.query("INSERT INTO user_permissions (user_id, permission_key) VALUES ($1, $2) ON CONFLICT DO NOTHING", [
      result.rows[0].id,
      permission
    ]);
  }

  console.log("Admin criado/atualizado:", result.rows[0]);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
