import bcrypt from "bcryptjs";
import cors from "cors";
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import express from "express";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import "dotenv/config";
import { z } from "zod";
import { pool, query } from "./db.js";
import { requireAuth, requireRole, signToken } from "./middleware/auth.js";

const app = express();
const port = Number(process.env.PORT ?? 3333);
const defaultCorsOrigins = [
  "https://filhos-do-rei-bjj-client.vercel.app",
  "https://www.filhosdoreibjj.com",
  "https://filhosdoreibjj.com"
];
const corsOrigins = Array.from(
  new Set([
    ...defaultCorsOrigins,
    ...(process.env.CORS_ORIGIN ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
  ])
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || corsOrigins.length === 0 || corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origem não permitida pelo CORS."));
    }
  })
);
app.use(express.json({ limit: "3mb" }));

const money = (value: unknown) => Number(value ?? 0);
const levelFromXp = (xp: number) => Math.min(100, Math.max(1, Math.floor(xp / 500) + 1));
const brl = (value: unknown) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value ?? 0));
const brDate = (value: unknown) => new Intl.DateTimeFormat("pt-BR").format(new Date(String(value)));
const permissionKeys = [
  "dashboard",
  "students",
  "finance",
  "plans",
  "attendance",
  "techniques",
  "ranking",
  "store",
  "competitions",
  "users",
  "registrations"
] as const;
const defaultRolePermissions: Record<string, string[]> = {
  admin: [...permissionKeys],
  teacher: ["dashboard", "students", "plans", "attendance", "techniques", "ranking", "store", "competitions", "registrations"],
  finance: ["dashboard", "finance", "plans"],
  student: ["dashboard", "finance", "techniques", "ranking", "store", "competitions"]
};
const passwordSchema = z
  .string()
  .min(6, "Senha precisa ter no mínimo 6 caracteres.")
  .max(8, "Senha precisa ter no máximo 8 caracteres.")
  .regex(/[^A-Za-z0-9]/, "Senha precisa ter pelo menos um caractere especial.");
const phoneSchema = z
  .string()
  .transform((value) => value.replace(/\D/g, ""))
  .refine((value) => value.length === 10 || value.length === 11, "Telefone precisa ter DDD e 10 ou 11 dígitos.");

const nullableText = z.string().optional().or(z.literal(""));
const planPayloadSchema = z.object({
  name: z.string().min(3),
  audience: z.string().min(2).default("Geral"),
  monthlyValue: z.coerce.number().min(0),
  dueDay: z.coerce.number().int().min(1).max(28).default(10),
  description: nullableText,
  status: z.enum(["active", "inactive"]).default("active")
});
const studentPayloadSchema = z.object({
  fullName: z.string().min(3),
  email: z.string().email().optional().or(z.literal("")),
  phoneDdd: z.string().max(3).optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  birthDate: z.string().optional().or(z.literal("")),
  cpf: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  zipCode: z.string().optional().or(z.literal("")),
  planId: z.string().uuid().optional().or(z.literal("")),
  billingDueDate: z.string().optional().or(z.literal("")),
  billingNotify: z.coerce.boolean().default(true),
  belt: z.string().default("Branca"),
  stripeCount: z.coerce.number().int().min(0).max(4).default(0),
  classesUntilNextStripe: z.coerce.number().int().min(0).default(12),
  goals: z.string().optional(),
  status: z.string().default("active")
});
const classPayloadSchema = z.object({
  title: z.string().min(3),
  focus: nullableText,
  classDate: z.string().min(10)
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, app: "Filhos do Rei BJJ API" });
});

app.post("/api/auth/login", async (req, res) => {
  const parsed = z
    .object({ email: z.string().min(1), password: z.string().min(1) })
    .safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ message: "E-mail ou senha inválidos." });
  }

  const userResult = await query<{
    id: string;
    name: string;
    username: string | null;
    email: string;
    password_hash: string;
    role: "admin" | "teacher" | "student" | "finance";
    avatar_url: string | null;
  }>(
    `SELECT id, name, username, email, password_hash, role, avatar_url
     FROM users
     WHERE lower(email) = $1 OR lower(COALESCE(username, '')) = $1`,
    [parsed.data.email.toLowerCase()]
  );

  const user = userResult.rows[0];
  if (!user || !(await bcrypt.compare(parsed.data.password, user.password_hash))) {
    return res.status(401).json({ message: "Credenciais inválidas." });
  }

  const permissions = await getUserPermissions(user.id, user.role);
  const tokenUser = { id: user.id, name: user.name, username: user.username, email: user.email, role: user.role, permissions };
  const student =
    user.role === "student"
      ? (
          await query(
            "SELECT id, full_name, belt, stripe_count, classes_until_next_stripe, photo_url, xp, level FROM students WHERE user_id = $1",
            [user.id]
          )
        ).rows[0] ?? null
      : null;

  return res.json({ token: signToken(tokenUser), user: tokenUser, student });
});

app.get("/api/me", requireAuth, async (req, res) => {
  const student =
    req.user?.role === "student"
      ? (
          await query(
            "SELECT id, full_name, belt, stripe_count, classes_until_next_stripe, photo_url, xp, level FROM students WHERE user_id = $1",
            [req.user.id]
          )
        ).rows[0] ?? null
      : null;

  res.json({ user: req.user, student });
});

app.post("/api/auth/register", async (req, res) => {
  const parsed = z
    .object({
      fullName: z.string().min(3),
      email: z.string().email(),
      phone: phoneSchema,
      password: passwordSchema
    })
    .safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Dados inválidos." });
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await query<{ id: string }>(
    `SELECT id FROM users WHERE lower(email) = $1
     UNION
     SELECT id FROM registration_requests WHERE lower(email) = $1 AND status = 'pending'`,
    [email]
  );

  if (existing.rows[0]) {
    return res.status(409).json({ message: "Já existe cadastro ou solicitação pendente para este e-mail." });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const result = await query(
    `INSERT INTO registration_requests (full_name, email, phone, password_hash)
     VALUES ($1, $2, $3, $4)
     RETURNING id, full_name, email, phone, status, requested_at`,
    [parsed.data.fullName, email, parsed.data.phone, passwordHash]
  );

  res.status(201).json(result.rows[0]);
});

app.post("/api/auth/password-reset", async (req, res) => {
  const parsed = z
    .object({
      email: z.string().email().optional().or(z.literal("")),
      phone: phoneSchema.optional().or(z.literal(""))
    })
    .safeParse(req.body);

  if (!parsed.success || (!parsed.data.email && !parsed.data.phone)) {
    return res.status(400).json({ message: "Informe e-mail ou telefone válido." });
  }

  const email = parsed.data.email ? parsed.data.email.toLowerCase() : null;
  const user = await query<{ id: string }>(
    `SELECT id FROM users
     WHERE ($1::text IS NOT NULL AND lower(email) = $1)
        OR ($2::text IS NOT NULL AND phone = $2)
     LIMIT 1`,
    [email, parsed.data.phone || null]
  );

  const result = await query(
    `INSERT INTO password_reset_requests (user_id, email, phone)
     VALUES ($1, $2, $3)
     RETURNING id, status, requested_at`,
    [user.rows[0]?.id ?? null, email, parsed.data.phone || null]
  );

  res.status(201).json(result.rows[0]);
});

app.get("/api/admin/registration-requests", requireAuth, requireRole(["admin"]), async (_req, res) => {
  const result = await query(
    `SELECT id, full_name, email, phone, status, requested_at, reviewed_at, note
     FROM registration_requests
     ORDER BY requested_at DESC`
  );
  res.json(result.rows);
});

app.patch("/api/admin/registration-requests/:id", requireAuth, requireRole(["admin"]), async (req, res) => {
  const parsed = z.object({ status: z.enum(["approved", "rejected"]), note: z.string().optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Status inválido." });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const requestResult = await client.query<{
      id: string;
      full_name: string;
      email: string;
      phone: string;
      password_hash: string;
      status: string;
    }>("SELECT * FROM registration_requests WHERE id = $1 FOR UPDATE", [req.params.id]);
    const requestRow = requestResult.rows[0];

    if (!requestRow) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Solicitação não encontrada." });
    }

    if (requestRow.status !== "pending") {
      await client.query("ROLLBACK");
      return res.status(409).json({ message: "Solicitação já revisada." });
    }

    if (parsed.data.status === "approved") {
      const phoneDigits = onlyDigits(requestRow.phone);
      const user = await client.query<{ id: string }>(
        `INSERT INTO users (name, email, phone, password_hash, role, avatar_url)
         VALUES ($1, $2, $3, $4, 'student', $5)
         ON CONFLICT (email)
         DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone, password_hash = EXCLUDED.password_hash, role = 'student', avatar_url = EXCLUDED.avatar_url
         RETURNING id`,
        [
          requestRow.full_name,
          requestRow.email,
          phoneDigits,
          requestRow.password_hash,
          `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(requestRow.full_name)}`
        ]
      );

      await client.query(
        `INSERT INTO students (user_id, full_name, email, phone_ddd, phone, belt, stripe_count, classes_until_next_stripe, goals, photo_url)
         VALUES ($1, $2, $3, NULLIF($4, ''), NULLIF($5, ''), 'Branca', 0, 12, 'Cadastro aprovado. Definir objetivos com o professor.', $6)
         ON CONFLICT (user_id)
         DO UPDATE SET full_name = EXCLUDED.full_name, email = EXCLUDED.email, phone_ddd = EXCLUDED.phone_ddd, phone = EXCLUDED.phone`,
        [
          user.rows[0].id,
          requestRow.full_name,
          requestRow.email,
          phoneDigits.slice(0, 2),
          phoneDigits.slice(2),
          `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(requestRow.full_name)}`
        ]
      );

      for (const permission of defaultRolePermissions.student) {
        await client.query("INSERT INTO user_permissions (user_id, permission_key) VALUES ($1, $2) ON CONFLICT DO NOTHING", [
          user.rows[0].id,
          permission
        ]);
      }
    }

    const updated = await client.query(
      `UPDATE registration_requests
       SET status = $1, reviewed_at = now(), reviewed_by = $2, note = $3
       WHERE id = $4
       RETURNING id, full_name, email, phone, status, reviewed_at, note`,
      [parsed.data.status, req.user?.id, parsed.data.note ?? "", req.params.id]
    );

    await client.query("COMMIT");
    res.json(updated.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});

app.get("/api/admin/password-reset-requests", requireAuth, requireRole(["admin"]), async (_req, res) => {
  const result = await query(
    `SELECT pr.id, pr.email, pr.phone, pr.status, pr.requested_at, pr.reviewed_at, pr.note,
      u.id AS user_id, u.name AS user_name
     FROM password_reset_requests pr
     LEFT JOIN users u ON u.id = pr.user_id
     ORDER BY pr.requested_at DESC`
  );
  res.json(result.rows);
});

app.patch("/api/admin/password-reset-requests/:id", requireAuth, requireRole(["admin"]), async (req, res) => {
  const parsed = z
    .object({ status: z.enum(["resolved", "rejected"]), newPassword: passwordSchema.optional(), note: z.string().optional() })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Dados inválidos." });
  if (parsed.data.status === "resolved" && !parsed.data.newPassword) {
    return res.status(400).json({ message: "Informe a nova senha." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const reset = await client.query<{ id: string; user_id: string | null; email: string | null; phone: string | null; status: string }>(
      "SELECT id, user_id, email, phone, status FROM password_reset_requests WHERE id = $1 FOR UPDATE",
      [req.params.id]
    );
    const row = reset.rows[0];

    if (!row) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Solicitação não encontrada." });
    }

    if (row.status !== "pending") {
      await client.query("ROLLBACK");
      return res.status(409).json({ message: "Solicitação já revisada." });
    }

    let userId = row.user_id;

    if (parsed.data.status === "resolved") {
      if (!userId) {
        const fallbackUser = await client.query<{ id: string }>(
          `SELECT id FROM users
           WHERE ($1::text IS NOT NULL AND lower(email) = lower($1))
              OR ($2::text IS NOT NULL AND phone = $2)
           LIMIT 1`,
          [row.email, row.phone ? onlyDigits(row.phone) : null]
        );
        userId = fallbackUser.rows[0]?.id ?? null;
      }

      if (!userId) {
        await client.query("ROLLBACK");
        return res.status(404).json({ message: "Usuário não encontrado para esta solicitação." });
      }
      await client.query("UPDATE users SET password_hash = $1 WHERE id = $2", [await bcrypt.hash(parsed.data.newPassword!, 10), userId]);
    }

    const updated = await client.query(
      `UPDATE password_reset_requests
       SET status = $1, reviewed_at = now(), reviewed_by = $2, note = $3, user_id = COALESCE(user_id, $5)
       WHERE id = $4
       RETURNING *`,
      [parsed.data.status, req.user?.id, parsed.data.note ?? "", req.params.id, userId]
    );

    await client.query("COMMIT");
    res.json(updated.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});

app.get("/api/admin/users", requireAuth, requireRole(["admin"]), async (_req, res) => {
  const result = await query(
    `SELECT u.id, u.name, u.username, u.email, u.phone, u.role::text, u.created_at,
      COALESCE(array_agg(up.permission_key) FILTER (WHERE up.permission_key IS NOT NULL), '{}') AS permissions
     FROM users u
     LEFT JOIN user_permissions up ON up.user_id = u.id
     GROUP BY u.id
     ORDER BY u.created_at DESC`
  );
  res.json(result.rows);
});

app.patch("/api/admin/users/:id", requireAuth, requireRole(["admin"]), async (req, res) => {
  const parsed = z
    .object({
      name: z.string().min(2),
      username: z.string().min(2).optional().or(z.literal("")),
      email: z.string().email(),
      phone: phoneSchema.optional().or(z.literal("")),
      role: z.enum(["admin", "teacher", "student", "finance"]),
      permissions: z.array(z.string()).default([])
    })
    .safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Dados inválidos." });
  }

  const safePermissions = parsed.data.permissions.filter((permission) => permissionKeys.includes(permission as (typeof permissionKeys)[number]));
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const updated = await client.query(
      `UPDATE users
       SET name = $1, username = NULLIF($2, ''), email = $3, phone = NULLIF($4, ''), role = $5
       WHERE id = $6
       RETURNING id, name, username, email, phone, role::text`,
      [parsed.data.name, parsed.data.username ?? "", parsed.data.email.toLowerCase(), parsed.data.phone ?? "", parsed.data.role, req.params.id]
    );

    if (!updated.rows[0]) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    await client.query("DELETE FROM user_permissions WHERE user_id = $1", [req.params.id]);
    for (const permission of safePermissions) {
      await client.query("INSERT INTO user_permissions (user_id, permission_key) VALUES ($1, $2) ON CONFLICT DO NOTHING", [
        req.params.id,
        permission
      ]);
    }

    await client.query("COMMIT");
    res.json({ ...updated.rows[0], permissions: safePermissions });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});

app.get(
  "/api/admin/dashboard",
  requireAuth,
  requireRole(["admin", "teacher", "finance"]),
  async (_req, res) => {
    const [studentsCount, revenue, overdue, attendance, newStudents, payments, evolution] =
      await Promise.all([
        query<{ total: string }>("SELECT COUNT(*) AS total FROM students WHERE status = 'active'"),
        query<{ total: string }>(
          "SELECT COALESCE(SUM(value), 0) AS total FROM payments WHERE status = 'paid' AND date_trunc('month', paid_at) = date_trunc('month', CURRENT_DATE)"
        ),
        query<{ total: string }>("SELECT COUNT(*) AS total FROM payments WHERE status = 'overdue'"),
        query<{ total: string }>(
          "SELECT COUNT(*) AS total FROM attendance WHERE check_in_at >= date_trunc('month', now())"
        ),
        query<{ total: string }>(
          "SELECT COUNT(*) AS total FROM students WHERE created_at >= date_trunc('month', now())"
        ),
        query<{ status: string; total: string }>(
          "SELECT status::text, COUNT(*) AS total FROM payments GROUP BY status ORDER BY status"
        ),
        query<{ label: string; xp: string }>(
          `SELECT to_char(day, 'DD/MM') AS label, COALESCE(SUM(points), 0) AS xp
           FROM generate_series(CURRENT_DATE - interval '5 days', CURRENT_DATE, interval '1 day') day
           LEFT JOIN xp_history ON xp_history.created_at::date = day::date
           GROUP BY day
           ORDER BY day`
        )
      ]);

    res.json({
      cards: {
        activeStudents: Number(studentsCount.rows[0]?.total ?? 0),
        monthlyRevenue: money(revenue.rows[0]?.total),
        overduePayments: Number(overdue.rows[0]?.total ?? 0),
        monthlyAttendance: Number(attendance.rows[0]?.total ?? 0),
        newStudents: Number(newStudents.rows[0]?.total ?? 0)
      },
      payments: payments.rows.map((row) => ({ status: row.status, total: Number(row.total) })),
      evolution: evolution.rows.map((row) => ({ label: row.label, xp: Number(row.xp) }))
    });
  }
);

app.get("/api/plans", requireAuth, requireRole(["admin", "teacher", "finance"]), async (_req, res) => {
  const result = await query(
    `SELECT id, name, audience, monthly_value, due_day, billing_cycle, status, description, created_at, updated_at
     FROM membership_plans
     ORDER BY status, monthly_value, name`
  );
  res.json(result.rows);
});

app.post("/api/plans", requireAuth, requireRole(["admin", "teacher", "finance"]), async (req, res) => {
  const parsed = planPayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Dados do plano inválidos." });
  }

  const result = await query(
    `INSERT INTO membership_plans (name, audience, monthly_value, due_day, billing_cycle, status, description)
     VALUES ($1, $2, $3, $4, 'monthly', $5, NULLIF($6, ''))
     RETURNING *`,
    [
      parsed.data.name,
      parsed.data.audience,
      parsed.data.monthlyValue,
      parsed.data.dueDay,
      parsed.data.status,
      parsed.data.description ?? ""
    ]
  );
  res.status(201).json(result.rows[0]);
});

app.put("/api/plans/:id", requireAuth, requireRole(["admin", "teacher", "finance"]), async (req, res) => {
  const parsed = planPayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Dados do plano inválidos." });
  }

  const result = await query(
    `UPDATE membership_plans
     SET name = $1, audience = $2, monthly_value = $3, due_day = $4, status = $5, description = NULLIF($6, ''), updated_at = now()
     WHERE id = $7
     RETURNING *`,
    [
      parsed.data.name,
      parsed.data.audience,
      parsed.data.monthlyValue,
      parsed.data.dueDay,
      parsed.data.status,
      parsed.data.description ?? "",
      req.params.id
    ]
  );

  if (!result.rows[0]) return res.status(404).json({ message: "Plano não encontrado." });
  res.json(result.rows[0]);
});

app.get("/api/students", requireAuth, requireRole(["admin", "teacher", "finance"]), async (_req, res) => {
  const result = await query(
    `SELECT s.*,
      mp.name AS plan_name,
      mp.monthly_value AS plan_value,
      mp.due_day AS plan_due_day,
      mp.status AS plan_status,
      COALESCE(COUNT(a.id) FILTER (WHERE a.check_in_at >= date_trunc('month', now())), 0) AS monthly_attendance,
      p.status AS payment_status,
      p.due_date,
      p.value AS payment_value
     FROM students s
     LEFT JOIN membership_plans mp ON mp.id = s.plan_id
     LEFT JOIN attendance a ON a.student_id = s.id
     LEFT JOIN LATERAL (
       SELECT status, due_date, value
       FROM payments
       WHERE payments.student_id = s.id
       ORDER BY due_date DESC
       LIMIT 1
     ) p ON true
     GROUP BY s.id, mp.id, p.status, p.due_date, p.value
     ORDER BY s.created_at DESC`
  );

  res.json(result.rows);
});

app.post("/api/students", requireAuth, requireRole(["admin", "teacher"]), async (req, res) => {
  const parsed = studentPayloadSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ message: "Dados do aluno inválidos." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `INSERT INTO students (
        full_name, email, phone_ddd, phone, birth_date, cpf, address, zip_code, plan_id, billing_due_date,
        billing_notify, belt, stripe_count, classes_until_next_stripe, goals, photo_url
       )
       VALUES ($1, NULLIF($2, ''), NULLIF($3, ''), NULLIF($4, ''), NULLIF($5, '')::date, NULLIF($6, ''),
        NULLIF($7, ''), NULLIF($8, ''), NULLIF($9, '')::uuid, NULLIF($10, '')::date, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        parsed.data.fullName,
        parsed.data.email ?? "",
        parsed.data.phoneDdd ?? "",
        parsed.data.phone ?? "",
        parsed.data.birthDate ?? "",
        onlyDigits(parsed.data.cpf ?? ""),
        parsed.data.address ?? "",
        onlyDigits(parsed.data.zipCode ?? ""),
        parsed.data.planId ?? "",
        parsed.data.billingDueDate ?? "",
        parsed.data.billingNotify,
        parsed.data.belt,
        parsed.data.stripeCount,
        parsed.data.classesUntilNextStripe,
        parsed.data.goals ?? "Treinar 3x por semana e evoluir fundamentos.",
        `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(parsed.data.fullName)}`
      ]
    );

    await syncMembershipPayment(client, result.rows[0].id, parsed.data.planId, parsed.data.billingDueDate);
    await client.query("COMMIT");
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});

app.put("/api/students/:id", requireAuth, requireRole(["admin", "teacher"]), async (req, res) => {
  const parsed = studentPayloadSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ message: "Dados do aluno inválidos." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `UPDATE students
       SET full_name = $1, email = NULLIF($2, ''), phone_ddd = NULLIF($3, ''), phone = NULLIF($4, ''),
        birth_date = NULLIF($5, '')::date, cpf = NULLIF($6, ''), address = NULLIF($7, ''), zip_code = NULLIF($8, ''),
        plan_id = NULLIF($9, '')::uuid, billing_due_date = NULLIF($10, '')::date, billing_notify = $11,
        belt = $12, stripe_count = $13, classes_until_next_stripe = $14, goals = $15, status = $16
       WHERE id = $17
       RETURNING *`,
      [
        parsed.data.fullName,
        parsed.data.email ?? "",
        parsed.data.phoneDdd ?? "",
        parsed.data.phone ?? "",
        parsed.data.birthDate ?? "",
        onlyDigits(parsed.data.cpf ?? ""),
        parsed.data.address ?? "",
        onlyDigits(parsed.data.zipCode ?? ""),
        parsed.data.planId ?? "",
        parsed.data.billingDueDate ?? "",
        parsed.data.billingNotify,
        parsed.data.belt,
        parsed.data.stripeCount,
        parsed.data.classesUntilNextStripe,
        parsed.data.goals ?? "",
        parsed.data.status,
        req.params.id
      ]
    );

    if (!result.rows[0]) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Aluno não encontrado." });
    }

    await syncMembershipPayment(client, String(req.params.id), parsed.data.planId, parsed.data.billingDueDate);
    await client.query("COMMIT");
    return res.json(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});

app.post("/api/students-legacy-disabled", requireAuth, requireRole(["admin", "teacher"]), async (req, res) => {
  const parsed = z
    .object({
      fullName: z.string().min(3),
      email: z.string().email().optional().or(z.literal("")),
      phone: z.string().optional(),
      belt: z.string().default("Branca"),
      stripeCount: z.coerce.number().int().min(0).max(4).default(0),
      classesUntilNextStripe: z.coerce.number().int().min(0).default(12),
      goals: z.string().optional()
    })
    .safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ message: "Dados do aluno inválidos." });
  }

  const result = await query(
    `INSERT INTO students (full_name, email, phone, belt, stripe_count, classes_until_next_stripe, goals, photo_url)
     VALUES ($1, NULLIF($2, ''), $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      parsed.data.fullName,
      parsed.data.email ?? "",
      parsed.data.phone ?? "",
      parsed.data.belt,
      parsed.data.stripeCount,
      parsed.data.classesUntilNextStripe,
      parsed.data.goals ?? "Treinar 3x por semana e evoluir fundamentos.",
      `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(parsed.data.fullName)}`
    ]
  );

  res.status(201).json(result.rows[0]);
});

app.put("/api/students-legacy-disabled/:id", requireAuth, requireRole(["admin", "teacher"]), async (req, res) => {
  const parsed = z
    .object({
      fullName: z.string().min(3),
      phone: z.string().optional(),
      belt: z.string(),
      stripeCount: z.coerce.number().int().min(0).max(4),
      classesUntilNextStripe: z.coerce.number().int().min(0),
      goals: z.string().optional(),
      status: z.string().default("active")
    })
    .safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ message: "Dados do aluno inválidos." });
  }

  const result = await query(
    `UPDATE students
     SET full_name = $1, phone = $2, belt = $3, stripe_count = $4, classes_until_next_stripe = $5, goals = $6, status = $7
     WHERE id = $8
     RETURNING *`,
    [
      parsed.data.fullName,
      parsed.data.phone ?? "",
      parsed.data.belt,
      parsed.data.stripeCount,
      parsed.data.classesUntilNextStripe,
      parsed.data.goals ?? "",
      parsed.data.status,
      req.params.id
    ]
  );

  res.json(result.rows[0]);
});

app.delete("/api/students/:id", requireAuth, requireRole(["admin"]), async (req, res) => {
  await query("DELETE FROM students WHERE id = $1", [req.params.id]);
  res.status(204).end();
});

app.get("/api/student/dashboard", requireAuth, async (req, res) => {
  const studentResult = await query<{
    id: string;
    full_name: string;
    belt: string;
    stripe_count: number;
    classes_until_next_stripe: number;
    goals: string;
    photo_url: string;
    xp: number;
    level: number;
  }>("SELECT * FROM students WHERE user_id = $1 OR id = $2 LIMIT 1", [
    req.user?.id,
    req.query.studentId ?? null
  ]);
  const student = studentResult.rows[0];

  if (!student) {
    return res.status(404).json({ message: "Aluno não encontrado." });
  }

  const [attendance, nextClass, payment, techniques, ranking, checkin] = await Promise.all([
    query<{ total: string }>(
      "SELECT COUNT(*) AS total FROM attendance WHERE student_id = $1 AND check_in_at >= date_trunc('month', now())",
      [student.id]
    ),
    query(
      `SELECT id, title, class_date, focus
       FROM classes c
       WHERE (c.class_date::date = CURRENT_DATE OR c.class_date >= now())
         AND NOT EXISTS (
           SELECT 1 FROM attendance a WHERE a.class_id = c.id AND a.student_id = $1
         )
       ORDER BY CASE WHEN c.class_date::date = CURRENT_DATE THEN 0 ELSE 1 END, c.class_date ASC
       LIMIT 1`,
      [student.id]
    ),
    query(
      "SELECT reference_month, due_date, value, status, pix_code FROM payments WHERE student_id = $1 ORDER BY due_date DESC LIMIT 1",
      [student.id]
    ),
    query<{ status: string; total: string }>(
      `SELECT st.status::text, COUNT(*) AS total
       FROM student_techniques st
       WHERE st.student_id = $1
       GROUP BY st.status`,
      [student.id]
    ),
    query<{ position: string }>(
      `SELECT position FROM (
         SELECT student_id, RANK() OVER (ORDER BY COUNT(*) DESC) AS position
         FROM attendance
         GROUP BY student_id
       ) ranked
      WHERE student_id = $1`,
      [student.id]
    ),
    query(
      `SELECT tc.id, tc.status, tc.requested_at, tc.reviewed_at, tc.xp_awarded,
        c.id AS class_id, c.title, c.class_date, c.focus
       FROM training_checkins tc
       JOIN classes c ON c.id = tc.class_id
       WHERE tc.student_id = $1
       ORDER BY CASE WHEN tc.status = 'pending' THEN 0 ELSE 1 END, tc.requested_at DESC
       LIMIT 1`,
      [student.id]
    )
  ]);

  res.json({
    student,
    monthlyAttendance: Number(attendance.rows[0]?.total ?? 0),
    nextClass: nextClass.rows[0] ?? null,
    payment: payment.rows[0] ?? null,
    techniqueSummary: techniques.rows.map((row) => ({ status: row.status, total: Number(row.total) })),
    rankingPosition: Number(ranking.rows[0]?.position ?? 0),
    checkin: checkin.rows[0] ?? null
  });
});

app.patch("/api/student/photo", requireAuth, requireRole(["student"]), async (req, res) => {
  const parsed = z
    .object({
      photoUrl: z.string().regex(/^data:image\/(png|jpeg|jpg|webp);base64,/).max(2_500_000)
    })
    .safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ message: "Foto inválida ou muito grande." });
  }

  const result = await query(
    `UPDATE students
     SET photo_url = $1
     WHERE user_id = $2
     RETURNING id, photo_url`,
    [parsed.data.photoUrl, req.user?.id]
  );

  if (!result.rows[0]) {
    return res.status(404).json({ message: "Aluno não encontrado." });
  }

  res.json(result.rows[0]);
});

app.post("/api/student/checkins", requireAuth, async (req, res) => {
  const studentId = await resolveStudentId(req.user?.id, req.body.studentId);
  if (!studentId) return res.status(404).json({ message: "Aluno não encontrado." });

  const requestedClass = z.object({ classId: z.string().uuid().optional() }).safeParse(req.body);
  if (!requestedClass.success) return res.status(400).json({ message: "Aula inválida." });

  const classResult = requestedClass.data.classId
    ? await query(
        `SELECT id, title, class_date, focus
         FROM classes
         WHERE id = $1
           AND (class_date::date = CURRENT_DATE OR class_date >= now())`,
        [requestedClass.data.classId]
      )
    : await query(
        `SELECT c.id, c.title, c.class_date, c.focus
         FROM classes c
         WHERE (c.class_date::date = CURRENT_DATE OR c.class_date >= now())
           AND NOT EXISTS (
             SELECT 1 FROM attendance a WHERE a.class_id = c.id AND a.student_id = $1
           )
         ORDER BY CASE WHEN c.class_date::date = CURRENT_DATE THEN 0 ELSE 1 END, c.class_date ASC
         LIMIT 1`
        ,
        [studentId]
      );

  const classItem = classResult.rows[0];
  if (!classItem) return res.status(404).json({ message: "Nenhuma aula disponível para check-in." });

  const alreadyValidated = await query(
    "SELECT id FROM attendance WHERE class_id = $1 AND student_id = $2",
    [classItem.id, studentId]
  );

  if (alreadyValidated.rows[0]) {
    return res.json({
      status: "approved",
      message: "Este treino já foi validado.",
      class: classItem
    });
  }

  const result = await query(
    `INSERT INTO training_checkins (class_id, student_id, status)
     VALUES ($1, $2, 'pending')
     ON CONFLICT (class_id, student_id)
     DO UPDATE SET status = CASE
       WHEN training_checkins.status = 'rejected' THEN 'pending'
       ELSE training_checkins.status
     END,
     requested_at = CASE
       WHEN training_checkins.status = 'rejected' THEN now()
       ELSE training_checkins.requested_at
     END
     RETURNING *`,
    [classItem.id, studentId]
  );

  res.status(201).json({ ...result.rows[0], class: classItem });
});

app.get("/api/student/finance", requireAuth, async (req, res) => {
  const studentId = await resolveStudentId(req.user?.id, req.query.studentId);
  if (!studentId) return res.status(404).json({ message: "Aluno não encontrado." });

  const result = await query(
    "SELECT id, reference_month, due_date, paid_at, value, status, pix_code FROM payments WHERE student_id = $1 ORDER BY due_date DESC",
    [studentId]
  );
  res.json(result.rows);
});

app.get("/api/finance/summary", requireAuth, requireRole(["admin", "teacher", "finance"]), async (req, res) => {
  const period = financePeriod(req.query.month);
  const [entries, payments, pendingPayments] = await Promise.all([
    query<{ type: string; total: string }>(
      `SELECT type, COALESCE(SUM(amount), 0) AS total
       FROM financial_entries
       WHERE status = 'paid' AND entry_date >= $1::date AND entry_date < $2::date
       GROUP BY type`,
      [period.startDate, period.endDate]
    ),
    query<{ total: string }>(
      "SELECT COALESCE(SUM(value), 0) AS total FROM payments WHERE status = 'paid' AND paid_at >= $1::date AND paid_at < $2::date",
      [period.startDate, period.endDate]
    ),
    query<{ total: string }>(
      "SELECT COALESCE(SUM(value), 0) AS total FROM payments WHERE status IN ('pending', 'overdue') AND due_date >= $1::date AND due_date < $2::date",
      [period.startDate, period.endDate]
    )
  ]);

  const extraIncome = money(entries.rows.find((row) => row.type === "income")?.total);
  const expenses = money(entries.rows.find((row) => row.type === "expense")?.total);
  const membershipIncome = money(payments.rows[0]?.total);
  const income = membershipIncome + extraIncome;

  res.json({
    income,
    membershipIncome,
    extraIncome,
    expenses,
    profit: income - expenses,
    receivable: money(pendingPayments.rows[0]?.total)
  });
});

app.get("/api/finance/entries", requireAuth, requireRole(["admin", "teacher", "finance"]), async (req, res) => {
  const period = financePeriod(req.query.month);
  const result = await query(
    `SELECT fe.*, u.name AS created_by_name
     FROM financial_entries fe
     LEFT JOIN users u ON u.id = fe.created_by
     WHERE fe.entry_date >= $1::date AND fe.entry_date < $2::date
     ORDER BY fe.entry_date DESC, fe.created_at DESC
     LIMIT 200`,
    [period.startDate, period.endDate]
  );
  res.json(result.rows);
});

app.get("/api/finance/report/:format", requireAuth, requireRole(["admin", "teacher", "finance"]), async (req, res) => {
  const format = String(req.params.format);
  if (!["xlsx", "pdf", "docx"].includes(format)) {
    return res.status(400).json({ message: "Formato inválido." });
  }

  const report = await getFinanceReport(req.query.month);
  const filename = `relatorio-financeiro-filhos-do-rei-${report.period.month}.${format}`;

  if (format === "xlsx") {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Filhos do Rei BJJ";
    workbook.created = new Date();
    const sheet = workbook.addWorksheet("Financeiro");
    sheet.views = [{ state: "frozen", ySplit: 10 }];
    sheet.properties.defaultRowHeight = 22;

    sheet.mergeCells("A1:G1");
    sheet.getCell("A1").value = "FILHOS DO REI BJJ - WILLIAM LAGO";
    sheet.getCell("A1").font = { bold: true, color: { argb: "FFFFC40F" }, size: 18 };
    sheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
    sheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0D0D0D" } };
    sheet.getRow(1).height = 34;

    sheet.mergeCells("A2:G2");
    sheet.getCell("A2").value = `Relatório financeiro de ${report.period.label} gerado em ${brDate(new Date())}`;
    sheet.getCell("A2").font = { color: { argb: "FFFFFFFF" }, size: 11 };
    sheet.getCell("A2").alignment = { horizontal: "center" };
    sheet.getCell("A2").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1B1B1B" } };

    const summaryRows = [
      ["Receitas do período", report.summary.income],
      ["Mensalidades recebidas", report.summary.membershipIncome],
      ["Receitas avulsas", report.summary.extraIncome],
      ["Gastos do período", report.summary.expenses],
      ["Lucro líquido", report.summary.profit],
      ["Mensalidades a receber", report.summary.receivable]
    ];

    summaryRows.forEach(([label, value], index) => {
      const rowNumber = index < 3 ? 4 : 6;
      const col = (index % 3) * 2 + 1;
      const labelCell = sheet.getCell(rowNumber, col);
      const valueCell = sheet.getCell(rowNumber, col + 1);
      labelCell.value = label;
      valueCell.value = Number(value);
      labelCell.font = { bold: true, color: { argb: "FFFFC40F" } };
      valueCell.font = { bold: true, color: { argb: Number(value) < 0 ? "FFE74C3C" : "FFFFFFFF" }, size: 12 };
      valueCell.numFmt = '"R$" #,##0.00;[Red]-"R$" #,##0.00';
      [labelCell, valueCell].forEach((cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF151515" } };
        cell.border = {
          top: { style: "thin", color: { argb: "FF2A2A2A" } },
          left: { style: "thin", color: { argb: "FF2A2A2A" } },
          bottom: { style: "thin", color: { argb: "FF2A2A2A" } },
          right: { style: "thin", color: { argb: "FF2A2A2A" } }
        };
      });
    });

    const headerRowNumber = 9;
    const header = sheet.getRow(headerRowNumber);
    header.values = ["Tipo", "Categoria", "Descrição", "Data", "Status", "Método", "Valor"];
    header.height = 26;
    header.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FF0D0D0D" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFC40F" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin", color: { argb: "FFFFC40F" } },
        left: { style: "thin", color: { argb: "FF0D0D0D" } },
        bottom: { style: "thin", color: { argb: "FF0D0D0D" } },
        right: { style: "thin", color: { argb: "FF0D0D0D" } }
      };
    });

    report.entries.forEach((entry) => {
      sheet.addRow([
        entry.type === "income" ? "Receita" : "Despesa",
        entry.category,
        entry.description,
        new Date(entry.entry_date),
        entry.status === "paid" ? "Pago" : "Pendente",
        entry.payment_method ?? "",
        Number(entry.amount)
      ]);
    });

    sheet.columns = [
      { key: "type", width: 14 },
      { key: "category", width: 22 },
      { key: "description", width: 38 },
      { key: "date", width: 14 },
      { key: "status", width: 14 },
      { key: "method", width: 18 },
      { key: "amount", width: 16 }
    ];
    sheet.autoFilter = { from: "A9", to: `G${Math.max(9, sheet.rowCount)}` };

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber <= headerRowNumber) return;
      row.height = 24;
      row.eachCell((cell, colNumber) => {
        cell.alignment = { vertical: "middle", wrapText: colNumber === 3 };
        cell.border = {
          bottom: { style: "thin", color: { argb: "FF2A2A2A" } }
        };
        if (rowNumber % 2 === 0) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF111111" } };
        }
        if (colNumber === 4) cell.numFmt = "dd/mm/yyyy";
        if (colNumber === 7) {
          cell.numFmt = '"R$" #,##0.00';
          cell.font = { bold: true, color: { argb: row.getCell(1).value === "Receita" ? "FF2ECC71" : "FFE74C3C" } };
        } else {
          cell.font = { color: { argb: "FFFFFFFF" } };
        }
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(Buffer.from(buffer));
  }

  if (format === "docx") {
    const rows = [
      new TableRow({
        children: ["Tipo", "Categoria", "Descrição", "Data", "Status", "Valor"].map(
          (text) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })] })
        )
      }),
      ...report.entries.map(
        (entry) =>
          new TableRow({
            children: [
              entry.type === "income" ? "Receita" : "Despesa",
              entry.category,
              entry.description,
              brDate(entry.entry_date),
              entry.status === "paid" ? "Pago" : "Pendente",
              brl(entry.amount)
            ].map((text) => new TableCell({ children: [new Paragraph(String(text))] }))
          })
      )
    ];

    const document = new Document({
      sections: [
        {
          children: [
            new Paragraph({ children: [new TextRun({ text: "Filhos do Rei BJJ - Relatório Financeiro", bold: true, size: 32 })] }),
            new Paragraph(`Período: ${report.period.label}`),
            new Paragraph(`Gerado em ${brDate(new Date())}`),
            new Paragraph(""),
            new Paragraph(`Receitas: ${brl(report.summary.income)}`),
            new Paragraph(`Gastos: ${brl(report.summary.expenses)}`),
            new Paragraph(`Lucro líquido: ${brl(report.summary.profit)}`),
            new Paragraph(`Mensalidades a receber: ${brl(report.summary.receivable)}`),
            new Paragraph(""),
            new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows })
          ]
        }
      ]
    });
    const buffer = await Packer.toBuffer(document);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(buffer);
  }

  const chunks: Buffer[] = [];
  const pdf = new PDFDocument({ margin: 40 });
  pdf.on("data", (chunk: Buffer) => chunks.push(chunk));
  pdf.on("end", () => {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(Buffer.concat(chunks));
  });

  pdf.fontSize(18).text("Filhos do Rei BJJ - Relatório Financeiro", { underline: true });
  pdf.moveDown();
  pdf.fontSize(11).text(`Período: ${report.period.label}`);
  pdf.fontSize(11).text(`Gerado em ${brDate(new Date())}`);
  pdf.moveDown();
  pdf.text(`Receitas: ${brl(report.summary.income)}`);
  pdf.text(`Gastos: ${brl(report.summary.expenses)}`);
  pdf.text(`Lucro líquido: ${brl(report.summary.profit)}`);
  pdf.text(`Mensalidades a receber: ${brl(report.summary.receivable)}`);
  pdf.moveDown();
  pdf.fontSize(13).text("Lançamentos");
  pdf.moveDown(0.5);
  report.entries.forEach((entry) => {
    pdf.fontSize(10).text(
      `${brDate(entry.entry_date)} | ${entry.type === "income" ? "Receita" : "Despesa"} | ${entry.category} | ${entry.description} | ${entry.status === "paid" ? "Pago" : "Pendente"} | ${brl(entry.amount)}`
    );
  });
  pdf.end();
});

app.post("/api/finance/entries", requireAuth, requireRole(["admin", "teacher", "finance"]), async (req, res) => {
  const parsed = z
    .object({
      type: z.enum(["income", "expense"]),
      category: z.string().min(2),
      description: z.string().min(3),
      amount: z.coerce.number().min(0),
      entryDate: z.string().min(10),
      status: z.enum(["paid", "pending"]).default("paid"),
      paymentMethod: z.string().optional(),
      notes: z.string().optional()
    })
    .safeParse(req.body);

  if (!parsed.success) return res.status(400).json({ message: "Lançamento financeiro inválido." });

  const result = await query(
    `INSERT INTO financial_entries (type, category, description, amount, entry_date, status, payment_method, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      parsed.data.type,
      parsed.data.category,
      parsed.data.description,
      parsed.data.amount,
      parsed.data.entryDate,
      parsed.data.status,
      parsed.data.paymentMethod ?? "",
      parsed.data.notes ?? "",
      req.user?.id
    ]
  );

  res.status(201).json(result.rows[0]);
});

app.patch("/api/finance/entries/:id/status", requireAuth, requireRole(["admin", "teacher", "finance"]), async (req, res) => {
  const parsed = z.object({ status: z.enum(["paid", "pending"]) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Status inválido." });

  const result = await query("UPDATE financial_entries SET status = $1 WHERE id = $2 RETURNING *", [
    parsed.data.status,
    req.params.id
  ]);
  res.json(result.rows[0]);
});

app.delete("/api/finance/entries/:id", requireAuth, requireRole(["admin", "teacher", "finance"]), async (req, res) => {
  await query("DELETE FROM financial_entries WHERE id = $1", [req.params.id]);
  res.status(204).end();
});

app.patch(
  "/api/payments/:id/status",
  requireAuth,
  requireRole(["admin", "teacher", "finance"]),
  async (req, res) => {
    const parsed = z.object({ status: z.enum(["paid", "pending", "overdue"]) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Status inválido." });

    const result = await query(
      "UPDATE payments SET status = $1::payment_status, paid_at = CASE WHEN $1::payment_status = 'paid' THEN CURRENT_DATE ELSE paid_at END WHERE id = $2 RETURNING *",
      [parsed.data.status, req.params.id]
    );
    res.json(result.rows[0]);
  }
);

app.get("/api/techniques", requireAuth, async (req, res) => {
  const studentId = await resolveStudentId(req.user?.id, req.query.studentId);
  const result = await query(
    `SELECT t.id, t.category, t.name, t.description, t.video_url, t.notes,
      COALESCE(st.status::text, 'not_learned') AS status
     FROM techniques t
     LEFT JOIN student_techniques st ON st.technique_id = t.id AND st.student_id = $1
     ORDER BY t.category, t.name`,
    [studentId]
  );
  res.json(result.rows);
});

app.post("/api/techniques", requireAuth, requireRole(["admin", "teacher"]), async (req, res) => {
  const parsed = z
    .object({
      category: z.string().min(2),
      name: z.string().min(2),
      description: z.string().optional(),
      videoUrl: z.string().optional(),
      notes: z.string().optional()
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Técnica inválida." });

  const result = await query(
    `INSERT INTO techniques (category, name, description, video_url, notes)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      parsed.data.category,
      parsed.data.name,
      parsed.data.description ?? "",
      parsed.data.videoUrl ?? "",
      parsed.data.notes ?? ""
    ]
  );
  res.status(201).json(result.rows[0]);
});

app.patch("/api/techniques/:id/status", requireAuth, requireRole(["admin", "teacher"]), async (req, res) => {
  const parsed = z
    .object({ studentId: z.string().uuid(), status: z.enum(["learned", "developing", "not_learned"]) })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Dados inválidos." });

  const result = await query(
    `INSERT INTO student_techniques (student_id, technique_id, status)
     VALUES ($1, $2, $3)
     ON CONFLICT (student_id, technique_id)
     DO UPDATE SET status = EXCLUDED.status, updated_at = now()
     RETURNING *`,
    [parsed.data.studentId, req.params.id, parsed.data.status]
  );
  res.json(result.rows[0]);
});

app.put("/api/techniques/:id", requireAuth, requireRole(["admin", "teacher"]), async (req, res) => {
  const parsed = z
    .object({
      category: z.string().min(2),
      name: z.string().min(2),
      description: z.string().optional(),
      videoUrl: z.string().optional(),
      notes: z.string().optional()
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Técnica inválida." });

  const result = await query(
    `UPDATE techniques
     SET category = $1, name = $2, description = $3, video_url = $4, notes = $5
     WHERE id = $6
     RETURNING *`,
    [
      parsed.data.category,
      parsed.data.name,
      parsed.data.description ?? "",
      parsed.data.videoUrl ?? "",
      parsed.data.notes ?? "",
      req.params.id
    ]
  );
  res.json(result.rows[0]);
});

app.delete("/api/techniques/:id", requireAuth, requireRole(["admin", "teacher"]), async (req, res) => {
  await query("DELETE FROM techniques WHERE id = $1", [req.params.id]);
  res.status(204).end();
});

app.get("/api/classes", requireAuth, async (_req, res) => {
  const result = await query(
    `SELECT c.id, c.title, c.class_date, c.focus, t.name AS teacher_name,
      COUNT(a.id) AS attendees
     FROM classes c
     LEFT JOIN teachers t ON t.id = c.teacher_id
     LEFT JOIN attendance a ON a.class_id = c.id
     GROUP BY c.id, t.name
     ORDER BY c.class_date DESC
     LIMIT 20`
  );
  res.json(result.rows.map((row) => ({ ...row, attendees: Number(row.attendees) })));
});

app.post("/api/classes", requireAuth, requireRole(["admin", "teacher"]), async (req, res) => {
  const parsed = classPayloadSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Dados da aula inválidos." });

  const classDate = new Date(parsed.data.classDate);
  if (Number.isNaN(classDate.getTime())) {
    return res.status(400).json({ message: "Data da aula inválida." });
  }

  const teacher = await query<{ id: string }>("SELECT id FROM teachers WHERE user_id = $1 LIMIT 1", [req.user?.id]);
  const result = await query(
    `INSERT INTO classes (title, focus, class_date, teacher_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id, title, class_date, focus, NULL::text AS teacher_name, 0::int AS attendees`,
    [parsed.data.title, parsed.data.focus ?? "", classDate.toISOString(), teacher.rows[0]?.id ?? null]
  );

  res.status(201).json(result.rows[0]);
});

app.get("/api/checkin-requests", requireAuth, requireRole(["admin", "teacher"]), async (req, res) => {
  const status = String(req.query.status ?? "pending");
  const result = await query(
    `SELECT tc.id, tc.status, tc.requested_at, tc.reviewed_at, tc.xp_awarded,
      s.id AS student_id, s.full_name, s.photo_url, s.belt,
      c.id AS class_id, c.title, c.class_date, c.focus
     FROM training_checkins tc
     JOIN students s ON s.id = tc.student_id
     JOIN classes c ON c.id = tc.class_id
     WHERE tc.status = $1
     ORDER BY tc.requested_at ASC`,
    [status]
  );

  res.json(result.rows);
});

app.post("/api/attendance", requireAuth, requireRole(["admin", "teacher"]), async (req, res) => {
  const parsed = z.object({ classId: z.string().uuid(), studentId: z.string().uuid() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Dados de presença inválidos." });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const attendance = await client.query(
      `INSERT INTO attendance (class_id, student_id, xp_awarded)
       VALUES ($1, $2, 50)
       ON CONFLICT (class_id, student_id) DO NOTHING
       RETURNING *`,
      [parsed.data.classId, parsed.data.studentId]
    );

    if (attendance.rowCount) {
      await client.query(
        `UPDATE students
         SET xp = xp + 50,
             level = LEAST(100, GREATEST(1, ((xp + 50) / 500) + 1)),
             classes_until_next_stripe = GREATEST(0, classes_until_next_stripe - 1)
         WHERE id = $1`,
        [parsed.data.studentId]
      );
      await client.query("INSERT INTO xp_history (student_id, points, reason) VALUES ($1, 50, 'Treino realizado')", [
        parsed.data.studentId
      ]);
    }

    await client.query("COMMIT");
    res.status(201).json({ registered: Boolean(attendance.rowCount) });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});

app.patch("/api/checkin-requests/:id", requireAuth, requireRole(["admin", "teacher"]), async (req, res) => {
  const parsed = z.object({ status: z.enum(["approved", "rejected"]) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Status inválido." });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const requestResult = await client.query<{
      id: string;
      class_id: string;
      student_id: string;
      status: string;
    }>("SELECT id, class_id, student_id, status FROM training_checkins WHERE id = $1 FOR UPDATE", [
      req.params.id
    ]);

    const checkin = requestResult.rows[0];
    if (!checkin) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Solicitação não encontrada." });
    }

    let xpAwarded = 0;
    if (parsed.data.status === "approved") {
      const attendance = await client.query(
        `INSERT INTO attendance (class_id, student_id, check_in_at, xp_awarded)
         SELECT $1, $2, class_date, 50 FROM classes WHERE id = $1
         ON CONFLICT (class_id, student_id) DO NOTHING
         RETURNING *`,
        [checkin.class_id, checkin.student_id]
      );

      if (attendance.rowCount) {
        xpAwarded = 50;
        await client.query(
          `UPDATE students
           SET xp = xp + 50,
               level = LEAST(100, GREATEST(1, ((xp + 50) / 500) + 1)),
               classes_until_next_stripe = GREATEST(0, classes_until_next_stripe - 1)
           WHERE id = $1`,
          [checkin.student_id]
        );
        await client.query("INSERT INTO xp_history (student_id, points, reason) VALUES ($1, 50, 'Check-in confirmado pelo professor')", [
          checkin.student_id
        ]);
      }
    }

    const updated = await client.query(
      `UPDATE training_checkins
       SET status = $1, reviewed_at = now(), reviewed_by = $2, xp_awarded = $3
       WHERE id = $4
       RETURNING *`,
      [parsed.data.status, req.user?.id, xpAwarded, req.params.id]
    );

    await client.query("COMMIT");
    res.json(updated.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});

app.get("/api/ranking", requireAuth, async (req, res) => {
  const scope = String(req.query.scope ?? "monthly");
  const since =
    scope === "weekly"
      ? "date_trunc('week', now())"
      : scope === "general"
        ? "'2000-01-01'::timestamptz"
        : "date_trunc('month', now())";

  const result = await query(
    `SELECT s.id, s.full_name, s.photo_url, s.belt, s.xp, s.level, COUNT(a.id) AS trainings,
      RANK() OVER (ORDER BY COUNT(a.id) DESC, s.xp DESC) AS position
     FROM students s
     LEFT JOIN attendance a ON a.student_id = s.id AND a.check_in_at >= ${since}
     WHERE s.status = 'active'
     GROUP BY s.id
     ORDER BY position ASC, s.full_name ASC
     LIMIT 20`
  );

  res.json(result.rows.map((row) => ({ ...row, trainings: Number(row.trainings), position: Number(row.position) })));
});

app.get("/api/competitions", requireAuth, async (_req, res) => {
  const result = await query(
    `SELECT c.*,
      COUNT(cs.student_id) FILTER (WHERE cs.confirmed = true) AS confirmed_students
     FROM competitions c
     LEFT JOIN competition_students cs ON cs.competition_id = c.id
     GROUP BY c.id
     ORDER BY c.event_date ASC`
  );
  res.json(result.rows.map((row) => ({ ...row, confirmed_students: Number(row.confirmed_students) })));
});

app.post("/api/competitions", requireAuth, requireRole(["admin", "teacher"]), async (req, res) => {
  const parsed = z
    .object({
      name: z.string().min(3),
      eventDate: z.string().min(10),
      location: z.string().min(2),
      registrationFee: z.coerce.number().min(0),
      status: z.enum(["open", "closed", "completed"]).default("open")
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Competição inválida." });

  const result = await query(
    `INSERT INTO competitions (name, event_date, location, registration_fee, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [parsed.data.name, parsed.data.eventDate, parsed.data.location, parsed.data.registrationFee, parsed.data.status]
  );
  res.status(201).json(result.rows[0]);
});

app.put("/api/competitions/:id", requireAuth, requireRole(["admin", "teacher"]), async (req, res) => {
  const parsed = z
    .object({
      name: z.string().min(3),
      eventDate: z.string().min(10),
      location: z.string().min(2),
      registrationFee: z.coerce.number().min(0),
      status: z.enum(["open", "closed", "completed"]).default("open")
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Competição inválida." });

  const result = await query(
    `UPDATE competitions
     SET name = $1, event_date = $2, location = $3, registration_fee = $4, status = $5
     WHERE id = $6
     RETURNING *`,
    [parsed.data.name, parsed.data.eventDate, parsed.data.location, parsed.data.registrationFee, parsed.data.status, req.params.id]
  );
  res.json(result.rows[0]);
});

app.patch("/api/competitions/:id/status", requireAuth, requireRole(["admin", "teacher"]), async (req, res) => {
  const parsed = z.object({ status: z.enum(["open", "closed", "completed"]) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Status inválido." });

  const result = await query("UPDATE competitions SET status = $1 WHERE id = $2 RETURNING *", [
    parsed.data.status,
    req.params.id
  ]);
  res.json(result.rows[0]);
});

app.delete("/api/competitions/:id", requireAuth, requireRole(["admin", "teacher"]), async (req, res) => {
  await query("DELETE FROM competitions WHERE id = $1", [req.params.id]);
  res.status(204).end();
});

app.post("/api/competitions/:id/confirm", requireAuth, async (req, res) => {
  const studentId = await resolveStudentId(req.user?.id, req.body.studentId);
  if (!studentId) return res.status(404).json({ message: "Aluno não encontrado." });

  const result = await query(
    `INSERT INTO competition_students (competition_id, student_id, confirmed)
     VALUES ($1, $2, true)
     ON CONFLICT (competition_id, student_id)
     DO UPDATE SET confirmed = true
     RETURNING *`,
    [req.params.id, studentId]
  );
  res.json(result.rows[0]);
});

app.get("/api/products", requireAuth, async (_req, res) => {
  const result = await query("SELECT * FROM products WHERE archived_at IS NULL ORDER BY available DESC, category, name");
  res.json(result.rows);
});

app.post("/api/products", requireAuth, requireRole(["admin", "teacher"]), async (req, res) => {
  const parsed = z
    .object({
      name: z.string().min(2),
      category: z.string().min(2),
      price: z.coerce.number().positive(),
      stock: z.coerce.number().int().min(0),
      imageUrl: z.string().url().optional().or(z.literal("")),
      available: z.boolean().default(true)
    })
    .safeParse(req.body);

  if (!parsed.success) return res.status(400).json({ message: "Produto inválido." });

  const result = await query(
    `INSERT INTO products (name, category, price, stock, image_url, available, pix_code)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      parsed.data.name,
      parsed.data.category,
      parsed.data.price,
      parsed.data.stock,
      parsed.data.imageUrl || null,
      parsed.data.available,
      `PIX-FILHOS-DO-REI-${parsed.data.name.replace(/\s+/g, "-").toUpperCase()}`
    ]
  );
  res.status(201).json(result.rows[0]);
});

app.put("/api/products/:id", requireAuth, requireRole(["admin", "teacher"]), async (req, res) => {
  const parsed = z
    .object({
      name: z.string().min(2),
      category: z.string().min(2),
      price: z.coerce.number().positive(),
      stock: z.coerce.number().int().min(0),
      imageUrl: z.string().url().optional().or(z.literal("")),
      available: z.boolean().default(true)
    })
    .safeParse(req.body);

  if (!parsed.success) return res.status(400).json({ message: "Produto inválido." });

  const result = await query(
    `UPDATE products
     SET name = $1, category = $2, price = $3, stock = $4, image_url = $5, available = $6
     WHERE id = $7
     RETURNING *`,
    [
      parsed.data.name,
      parsed.data.category,
      parsed.data.price,
      parsed.data.stock,
      parsed.data.imageUrl || null,
      parsed.data.available,
      req.params.id
    ]
  );
  res.json(result.rows[0]);
});

app.patch("/api/products/:id/availability", requireAuth, requireRole(["admin", "teacher"]), async (req, res) => {
  const parsed = z.object({ available: z.boolean(), stock: z.coerce.number().int().min(0).optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Status inválido." });

  const result = await query(
    `UPDATE products
     SET available = $1, stock = COALESCE($2, stock)
     WHERE id = $3
     RETURNING *`,
    [parsed.data.available, parsed.data.stock ?? null, req.params.id]
  );
  res.json(result.rows[0]);
});

app.post("/api/products/:id/sell", requireAuth, requireRole(["admin", "teacher"]), async (req, res) => {
  const parsed = z
    .object({
      quantity: z.coerce.number().int().min(1),
      studentId: z.string().uuid().optional().or(z.literal("")),
      status: z.enum(["paid", "pending"]).default("paid")
    })
    .safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Venda inválida." });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const productResult = await client.query<{
      id: string;
      name: string;
      price: string;
      stock: number;
      available: boolean;
    }>("SELECT id, name, price, stock, available FROM products WHERE id = $1 FOR UPDATE", [req.params.id]);
    const product = productResult.rows[0];

    if (!product) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Produto não encontrado." });
    }
    if (!product.available || product.stock < parsed.data.quantity) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Produto sem estoque suficiente." });
    }

    const total = Number(product.price) * parsed.data.quantity;
    const order = await client.query(
      `INSERT INTO orders (product_id, student_id, quantity, total, status)
       VALUES ($1, NULLIF($2, '')::uuid, $3, $4, $5)
       RETURNING *`,
      [product.id, parsed.data.studentId ?? "", parsed.data.quantity, total, parsed.data.status]
    );

    const nextStock = product.stock - parsed.data.quantity;
    await client.query("UPDATE products SET stock = $1, available = CASE WHEN $1 <= 0 THEN false ELSE available END WHERE id = $2", [
      nextStock,
      product.id
    ]);

    await client.query(
      `INSERT INTO financial_entries (type, category, description, amount, entry_date, status, payment_method, notes, created_by)
       VALUES ('income', 'Loja', $1, $2, CURRENT_DATE, $3, 'PIX', $4, $5)`,
      [
        `Venda loja: ${product.name} x${parsed.data.quantity}`,
        total,
        parsed.data.status,
        `Pedido ${order.rows[0].id}`,
        req.user?.id
      ]
    );

    await client.query("COMMIT");
    res.status(201).json({ order: order.rows[0], stock: nextStock });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});

app.delete("/api/products/:id", requireAuth, requireRole(["admin", "teacher"]), async (req, res) => {
  const orders = await query<{ total: string }>("SELECT COUNT(*) AS total FROM orders WHERE product_id = $1", [req.params.id]);
  if (Number(orders.rows[0]?.total ?? 0) > 0) {
    const archived = await query(
      "UPDATE products SET available = false, stock = 0, archived_at = now() WHERE id = $1 RETURNING id",
      [req.params.id]
    );
    if (!archived.rows[0]) return res.status(404).json({ message: "Produto não encontrado." });
    return res.json({ archived: true });
  }

  const deleted = await query("DELETE FROM products WHERE id = $1 RETURNING id", [req.params.id]);
  if (!deleted.rows[0]) return res.status(404).json({ message: "Produto não encontrado." });
  res.status(204).end();
});

app.get("/api/posts", requireAuth, async (_req, res) => {
  const result = await query(
    `SELECT p.*, u.name AS author_name, COUNT(DISTINCT l.user_id) AS likes, COUNT(DISTINCT c.id) AS comments
     FROM posts p
     LEFT JOIN users u ON u.id = p.author_id
     LEFT JOIN likes l ON l.post_id = p.id
     LEFT JOIN comments c ON c.post_id = p.id
     GROUP BY p.id, u.name
     ORDER BY p.created_at DESC
     LIMIT 20`
  );
  res.json(result.rows.map((row) => ({ ...row, likes: Number(row.likes), comments: Number(row.comments) })));
});

function financePeriod(month?: unknown) {
  const raw = typeof month === "string" && /^\d{4}-\d{2}$/.test(month) ? month : new Date().toISOString().slice(0, 7);
  const [year, monthNumber] = raw.split("-").map(Number);
  const next = monthNumber === 12 ? { year: year + 1, month: 1 } : { year, month: monthNumber + 1 };
  const startDate = `${year}-${String(monthNumber).padStart(2, "0")}-01`;
  const endDate = `${next.year}-${String(next.month).padStart(2, "0")}-01`;
  const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${startDate}T00:00:00Z`)
  );

  return { month: raw, startDate, endDate, label };
}

async function getFinanceReport(month?: unknown) {
  const period = financePeriod(month);
  const [entriesTotals, payments, pendingPayments, entries] = await Promise.all([
    query<{ type: string; total: string }>(
      `SELECT type, COALESCE(SUM(amount), 0) AS total
       FROM financial_entries
       WHERE status = 'paid' AND entry_date >= $1::date AND entry_date < $2::date
       GROUP BY type`,
      [period.startDate, period.endDate]
    ),
    query<{ total: string }>(
      "SELECT COALESCE(SUM(value), 0) AS total FROM payments WHERE status = 'paid' AND paid_at >= $1::date AND paid_at < $2::date",
      [period.startDate, period.endDate]
    ),
    query<{ total: string }>(
      "SELECT COALESCE(SUM(value), 0) AS total FROM payments WHERE status IN ('pending', 'overdue') AND due_date >= $1::date AND due_date < $2::date",
      [period.startDate, period.endDate]
    ),
    query<{
      type: string;
      category: string;
      description: string;
      amount: string;
      entry_date: string;
      status: string;
      payment_method: string | null;
    }>(
      `SELECT type, category, description, amount, entry_date, status, payment_method
       FROM financial_entries
       WHERE entry_date >= $1::date AND entry_date < $2::date
       ORDER BY entry_date DESC, created_at DESC
       LIMIT 200`,
      [period.startDate, period.endDate]
    )
  ]);

  const extraIncome = money(entriesTotals.rows.find((row) => row.type === "income")?.total);
  const expenses = money(entriesTotals.rows.find((row) => row.type === "expense")?.total);
  const membershipIncome = money(payments.rows[0]?.total);
  const income = membershipIncome + extraIncome;

  return {
    period,
    summary: {
      income,
      membershipIncome,
      extraIncome,
      expenses,
      profit: income - expenses,
      receivable: money(pendingPayments.rows[0]?.total)
    },
    entries: entries.rows
  };
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function nextDueDate(dueDay: number) {
  const now = new Date();
  const candidate = new Date(now.getFullYear(), now.getMonth(), dueDay);
  if (candidate < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    candidate.setMonth(candidate.getMonth() + 1);
  }
  return candidate.toISOString().slice(0, 10);
}

function referenceMonth(date: string) {
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(`${date}T00:00:00`));
}

async function syncMembershipPayment(client: Pick<typeof pool, "query">, studentId: string, planId?: string, billingDueDate?: string) {
  if (!planId) return;

  const planResult = await client.query<{ name: string; monthly_value: string; due_day: number }>(
    "SELECT name, monthly_value, due_day FROM membership_plans WHERE id = $1 AND status = 'active'",
    [planId]
  );
  const plan = planResult.rows[0];
  if (!plan) return;

  const dueDate = billingDueDate || nextDueDate(Number(plan.due_day ?? 10));
  const month = referenceMonth(dueDate);
  const pixCode = `PIX ${plan.name} ${studentId.slice(0, 8)} ${month}`;
  const latestPending = await client.query<{ id: string }>(
    "SELECT id FROM payments WHERE student_id = $1 AND status = 'pending' ORDER BY due_date DESC LIMIT 1",
    [studentId]
  );

  if (latestPending.rows[0]) {
    await client.query("UPDATE payments SET reference_month = $1, due_date = $2, value = $3, pix_code = $4 WHERE id = $5", [
      month,
      dueDate,
      plan.monthly_value,
      pixCode,
      latestPending.rows[0].id
    ]);
    return;
  }

  await client.query(
    `INSERT INTO payments (student_id, reference_month, due_date, value, status, pix_code)
     VALUES ($1, $2, $3, $4, 'pending', $5)`,
    [studentId, month, dueDate, plan.monthly_value, pixCode]
  );
}

async function resolveStudentId(userId?: string, fallback?: unknown) {
  if (typeof fallback === "string" && fallback.length > 0) {
    return fallback;
  }

  if (!userId) return null;
  const result = await query<{ id: string }>("SELECT id FROM students WHERE user_id = $1", [userId]);
  return result.rows[0]?.id ?? null;
}

async function getUserPermissions(userId: string, role: string) {
  const result = await query<{ permission_key: string }>("SELECT permission_key FROM user_permissions WHERE user_id = $1", [userId]);
  if (result.rows.length) return result.rows.map((row) => row.permission_key);

  const defaults = defaultRolePermissions[role] ?? [];
  for (const permission of defaults) {
    await query("INSERT INTO user_permissions (user_id, permission_key) VALUES ($1, $2) ON CONFLICT DO NOTHING", [userId, permission]);
  }
  return defaults;
}

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({ message: "Erro interno no servidor." });
});

app.listen(port, () => {
  console.log(`Filhos do Rei BJJ API em http://localhost:${port}/api`);
});
