import bcrypt from "bcryptjs";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "../db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = resolve(__dirname, "../../../database/schema.sql");

const avatars = {
  admin: "https://api.dicebear.com/9.x/initials/svg?seed=William%20Lago",
  ana: "https://api.dicebear.com/9.x/initials/svg?seed=Ana%20Souza",
  bruno: "https://api.dicebear.com/9.x/initials/svg?seed=Bruno%20Lima",
  carla: "https://api.dicebear.com/9.x/initials/svg?seed=Carla%20Mendes",
  diego: "https://api.dicebear.com/9.x/initials/svg?seed=Diego%20Rocha"
};

const rolePermissions: Record<string, string[]> = {
  admin: ["dashboard", "students", "finance", "plans", "attendance", "techniques", "ranking", "store", "competitions", "users", "registrations"],
  teacher: ["dashboard", "students", "plans", "attendance", "techniques", "ranking", "store", "competitions", "registrations"],
  finance: ["dashboard", "finance", "plans"],
  student: ["dashboard", "finance", "techniques", "ranking", "store", "competitions"]
};

async function upsertUser(name: string, email: string, role: string, passwordHash: string, avatarUrl: string, username = "", phone = "") {
  const result = await pool.query<{ id: string }>(
    `INSERT INTO users (name, username, email, phone, password_hash, role, avatar_url)
     VALUES ($1, NULLIF($2, ''), $3, NULLIF($4, ''), $5, $6, $7)
     ON CONFLICT (email)
     DO UPDATE SET name = EXCLUDED.name, username = EXCLUDED.username, phone = EXCLUDED.phone, role = EXCLUDED.role, avatar_url = EXCLUDED.avatar_url
     RETURNING id`,
    [name, username, email, phone, passwordHash, role, avatarUrl]
  );
  return result.rows[0].id;
}

async function grantDefaultPermissions(userId: string, role: string) {
  await pool.query("DELETE FROM user_permissions WHERE user_id = $1", [userId]);
  for (const permission of rolePermissions[role] ?? []) {
    await pool.query("INSERT INTO user_permissions (user_id, permission_key) VALUES ($1, $2) ON CONFLICT DO NOTHING", [userId, permission]);
  }
}

async function main() {
  const schema = await readFile(schemaPath, "utf8");
  await pool.query(schema);

  const passwordHash = await bcrypt.hash("123456", 10);
  const adminPasswordHash = await bcrypt.hash("Admin@2026", 10);
  const adminId = await upsertUser("Admin", "admin@filhosdorei.local", "admin", adminPasswordHash, avatars.admin, "Admin");
  const teacherId = await upsertUser(
    "Professor William",
    "professor@filhosdorei.com",
    "teacher",
    passwordHash,
    avatars.admin
  );
  const anaUserId = await upsertUser("Ana Souza", "ana@aluno.com", "student", passwordHash, avatars.ana);
  const brunoUserId = await upsertUser("Bruno Lima", "bruno@aluno.com", "student", passwordHash, avatars.bruno);
  const carlaUserId = await upsertUser("Carla Mendes", "carla@aluno.com", "student", passwordHash, avatars.carla);
  const diegoUserId = await upsertUser("Diego Rocha", "diego@aluno.com", "student", passwordHash, avatars.diego);

  await grantDefaultPermissions(adminId, "admin");
  await grantDefaultPermissions(teacherId, "teacher");
  for (const userId of [anaUserId, brunoUserId, carlaUserId, diegoUserId]) {
    await grantDefaultPermissions(userId, "student");
  }

  const teacher = await pool.query<{ id: string }>(
    `INSERT INTO teachers (user_id, name, belt, phone)
     VALUES ($1, 'Professor William', 'Preta', '(11) 99999-0000')
     ON CONFLICT (user_id)
     DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [teacherId]
  );

  await pool.query("SELECT $1::uuid", [adminId]);

  const students = [
    [anaUserId, "Ana Souza", "ana@aluno.com", "(11) 90001-0001", "Azul", 2, 8, avatars.ana, 2350, 5],
    [brunoUserId, "Bruno Lima", "bruno@aluno.com", "(11) 90002-0002", "Branca", 3, 5, avatars.bruno, 1250, 3],
    [carlaUserId, "Carla Mendes", "carla@aluno.com", "(11) 90003-0003", "Roxa", 1, 14, avatars.carla, 4100, 9],
    [diegoUserId, "Diego Rocha", "diego@aluno.com", "(11) 90004-0004", "Azul", 4, 2, avatars.diego, 3050, 7]
  ] as const;

  const studentIds: string[] = [];
  for (const [userId, name, email, phone, belt, stripes, classesUntilNextStripe, photo, xp, level] of students) {
    const result = await pool.query<{ id: string }>(
      `INSERT INTO students (user_id, full_name, email, phone, belt, stripe_count, classes_until_next_stripe, goals, photo_url, xp, level)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'Treinar 3x por semana, manter frequência e evoluir transições.', $8, $9, $10)
       ON CONFLICT (email)
       DO UPDATE SET full_name = EXCLUDED.full_name, belt = EXCLUDED.belt, stripe_count = EXCLUDED.stripe_count,
         classes_until_next_stripe = EXCLUDED.classes_until_next_stripe, photo_url = EXCLUDED.photo_url, xp = EXCLUDED.xp, level = EXCLUDED.level
       RETURNING id`,
      [userId, name, email, phone, belt, stripes, classesUntilNextStripe, photo, xp, level]
    );
    studentIds.push(result.rows[0].id);
  }

  const classes = [
    ["Fundamentos No-Gi", "Guarda fechada e postura", "2026-06-30 19:30:00-03"],
    ["Treino de Passagem", "Passagem toreando e meia guarda", "2026-07-02 20:00:00-03"],
    ["Sparring Orientado", "Rounds situacionais", "2026-07-05 10:00:00-03"]
  ];

  const classIds: string[] = [];
  for (const [title, focus, date] of classes) {
    const result = await pool.query<{ id: string }>(
      `INSERT INTO classes (title, focus, class_date, teacher_id)
       SELECT $1, $2, $3, $4
       WHERE NOT EXISTS (SELECT 1 FROM classes WHERE title = $1 AND class_date = $3)
       RETURNING id`,
      [title, focus, date, teacher.rows[0].id]
    );
    const existing =
      result.rows[0] ??
      (
        await pool.query<{ id: string }>("SELECT id FROM classes WHERE title = $1 AND class_date = $2", [
          title,
          date
        ])
      ).rows[0];
    classIds.push(existing.id);
  }

  const techniques = [
    ["Guarda Fechada", "Armlock da guarda", "Controle de postura e ataque no braço."],
    ["Guarda Fechada", "Triângulo", "Quebra de postura e fechamento de ângulo."],
    ["Meia Guarda", "Reposição de guarda", "Ganhar joelho shield e recuperar espaço."],
    ["Montada", "Americana", "Isolamento do braço e finalização."],
    ["Costas", "Mata-leão", "Controle de pegada e ajuste de pressão."],
    ["Quedas", "Baiana", "Entrada, troca de nível e finalização da queda."],
    ["Finalizações", "Kimura", "Controle de punho e alavanca de ombro."],
    ["Raspagens", "Tesoura", "Desequilíbrio e inversão de base."],
    ["Passagens", "Toreando", "Controle de pernas e avanço lateral."]
  ];

  const techniqueIds: string[] = [];
  for (const [category, name, description] of techniques) {
    const result = await pool.query<{ id: string }>(
      `INSERT INTO techniques (category, name, description)
       SELECT $1, $2, $3
       WHERE NOT EXISTS (SELECT 1 FROM techniques WHERE category = $1 AND name = $2)
       RETURNING id`,
      [category, name, description]
    );
    const existing =
      result.rows[0] ??
      (
        await pool.query<{ id: string }>("SELECT id FROM techniques WHERE category = $1 AND name = $2", [
          category,
          name
        ])
      ).rows[0];
    techniqueIds.push(existing.id);
  }

  for (const studentId of studentIds) {
    for (let i = 0; i < techniqueIds.length; i += 1) {
      const status = i % 3 === 0 ? "learned" : i % 3 === 1 ? "developing" : "not_learned";
      await pool.query(
        `INSERT INTO student_techniques (student_id, technique_id, status)
         VALUES ($1, $2, $3)
         ON CONFLICT (student_id, technique_id)
         DO UPDATE SET status = EXCLUDED.status`,
        [studentId, techniqueIds[i], status]
      );
    }
  }

  const paymentRows = [
    [studentIds[0], "Julho/2026", "2026-07-10", "2026-07-04", 180, "paid"],
    [studentIds[1], "Julho/2026", "2026-07-10", null, 180, "pending"],
    [studentIds[2], "Junho/2026", "2026-06-10", null, 180, "overdue"],
    [studentIds[3], "Julho/2026", "2026-07-10", "2026-07-04", 180, "paid"]
  ];

  await pool.query("DELETE FROM payments WHERE student_id = ANY($1::uuid[])", [studentIds]);
  for (const [studentId, month, due, paidAt, value, status] of paymentRows) {
    await pool.query(
      `INSERT INTO payments (student_id, reference_month, due_date, paid_at, value, status, pix_code)
       SELECT $1, $2, $3, $4, $5, $6, 'PIX-FILHOS-DO-REI-MENSALIDADE'
       WHERE NOT EXISTS (SELECT 1 FROM payments WHERE student_id = $1 AND reference_month = $2)`,
      [studentId, month, due, paidAt, value, status]
    );
  }

  const financialEntries = [
    ["expense", "Aluguel", "Aluguel do espaço da academia", 2200, "paid", "Transferência"],
    ["expense", "Serviços", "Limpeza e manutenção", 450, "paid", "PIX"],
    ["expense", "Contas", "Energia elétrica", 380, "pending", "Boleto"],
    ["income", "Loja", "Venda avulsa de camiseta", 89, "paid", "PIX"]
  ];

  await pool.query("DELETE FROM financial_entries");
  await pool.query("DELETE FROM orders");
  for (const [type, category, description, amount, status, method] of financialEntries) {
    await pool.query(
      `INSERT INTO financial_entries (type, category, description, amount, entry_date, status, payment_method, created_by)
       VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, $6, $7)`,
      [type, category, description, amount, status, method, adminId]
    );
  }

  await pool.query("DELETE FROM training_checkins WHERE student_id = ANY($1::uuid[])", [studentIds]);
  await pool.query("DELETE FROM attendance WHERE student_id = ANY($1::uuid[])", [studentIds]);
  await pool.query("DELETE FROM xp_history WHERE student_id = ANY($1::uuid[])", [studentIds]);

  for (let i = 0; i < Math.min(2, classIds.length); i += 1) {
    for (const studentId of studentIds.slice(0, 3 + i)) {
      await pool.query(
        `INSERT INTO attendance (class_id, student_id, xp_awarded)
         VALUES ($1, $2, 50)
         ON CONFLICT (class_id, student_id) DO NOTHING`,
        [classIds[i], studentId]
      );
    }
  }

  for (const studentId of studentIds) {
    await pool.query(
      `INSERT INTO xp_history (student_id, points, reason, created_at)
       SELECT $1, 50, 'Treino realizado', now() - interval '1 day'
       WHERE NOT EXISTS (SELECT 1 FROM xp_history WHERE student_id = $1 AND reason = 'Treino realizado')`,
      [studentId]
    );
  }

  const competitions = [
    ["Open Filhos do Rei", "2026-07-20", "São Paulo - SP", 120],
    ["Copa Regional BJJ", "2026-08-15", "Guarulhos - SP", 150]
  ];

  for (const [name, date, location, fee] of competitions) {
    await pool.query(
      `INSERT INTO competitions (name, event_date, location, registration_fee)
       SELECT $1, $2, $3, $4
       WHERE NOT EXISTS (SELECT 1 FROM competitions WHERE name = $1 AND event_date = $2)`,
      [name, date, location, fee]
    );
  }

  const products = [
    [
      "Kimono Filhos do Rei Pro",
      "Kimono",
      420,
      8,
      "https://images.unsplash.com/photo-1612296727716-d6c69d2a2c91?auto=format&fit=crop&w=900&q=80"
    ],
    [
      "Rashguard Oficial",
      "Rashguard",
      169,
      14,
      "https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&w=900&q=80"
    ],
    [
      "Camiseta Team William Lago",
      "Camiseta",
      89,
      22,
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80"
    ]
  ];

  for (const [name, category, price, stock, image] of products) {
    const updated = await pool.query(
      `UPDATE products
       SET category = $2,
           price = $3,
           stock = $4,
           image_url = $5,
           available = true,
           pix_code = $6
       WHERE name = $1`,
      [name, category, price, stock, image, `PIX-FILHOS-DO-REI-${String(category).toUpperCase()}`]
    );

    if (!updated.rowCount) {
      await pool.query(
        `INSERT INTO products (name, category, price, stock, image_url, available, pix_code)
         VALUES ($1, $2, $3, $4, $5, true, $6)`,
        [name, category, price, stock, image, `PIX-FILHOS-DO-REI-${String(category).toUpperCase()}`]
      );
    }
  }

  await pool.query(
    `INSERT INTO posts (author_id, title, body, video_url)
     SELECT $1, 'Sequência da semana', 'Foco em postura na guarda fechada, passagem segura e controle lateral.',
       'https://www.youtube.com/embed/dQw4w9WgXcQ'
     WHERE NOT EXISTS (SELECT 1 FROM posts WHERE title = 'Sequência da semana')`,
    [teacherId]
  );

  console.log("Banco configurado com schema e dados demo.");
  console.log("Logins demo: Admin / Admin@2026 | ana@aluno.com / 123456");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
