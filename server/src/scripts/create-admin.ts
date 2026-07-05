import bcrypt from "bcryptjs";
import { pool } from "../db.js";

async function main() {
  const name = process.env.INITIAL_ADMIN_NAME ?? "Administrador";
  const email = process.env.INITIAL_ADMIN_EMAIL?.toLowerCase();
  const password = process.env.INITIAL_ADMIN_PASSWORD;

  if (!email || !password || password.length < 8) {
    throw new Error("Configure INITIAL_ADMIN_EMAIL e INITIAL_ADMIN_PASSWORD com pelo menos 8 caracteres.");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, role, avatar_url)
     VALUES ($1, $2, $3, 'admin', $4)
     ON CONFLICT (email)
     DO UPDATE SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash, role = 'admin'
     RETURNING id, name, email, role`,
    [name, email, passwordHash, `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}`]
  );

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
