import {
  Award,
  BookOpen,
  CalendarCheck,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  CreditCard,
  Download,
  FileSpreadsheet,
  FileText,
  Home,
  LogOut,
  Medal,
  MessageCircle,
  Pencil,
  Plus,
  Save,
  Shield,
  ShoppingBag,
  Trophy,
  UserPlus,
  Users
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  type AdminDashboard,
  type AdminUser,
  type CheckinRequest,
  type ClassItem,
  type Competition,
  type FinanceEntry,
  type FinanceSummary,
  type Payment,
  type Product,
  type RankingItem,
  type RegistrationRequest,
  type PasswordResetRequest,
  type Session,
  type Student,
  type StudentDashboard,
  type Technique,
  API_URL,
  formatDate,
  formatDateTime,
  formatMoney,
  request
} from "./lib/api";
import { Badge, Button, Card, EmptyState, Input, Select } from "./components/ui";

const sessionKey = "filhos-do-rei-session";
const beltOptions = ["Branca", "Cinza", "Amarela", "Laranja", "Verde", "Azul", "Roxa", "Marrom", "Preta"] as const;
const emptyStudentForm = {
  fullName: "",
  email: "",
  phone: "",
  belt: "Branca",
  stripeCount: 0,
  classesUntilNextStripe: 12,
  goals: "",
  status: "active"
};
const permissionOptions = [
  ["dashboard", "Dashboard"],
  ["students", "Alunos"],
  ["finance", "Financeiro"],
  ["attendance", "Presença"],
  ["techniques", "Técnicas"],
  ["ranking", "Ranking"],
  ["store", "Loja"],
  ["competitions", "Competições"],
  ["users", "Usuários"],
  ["registrations", "Solicitações"]
] as const;

const adminNav = [
  { key: "dashboard", label: "Dashboard", icon: Home },
  { key: "students", label: "Alunos", icon: Users },
  { key: "finance", label: "Financeiro", icon: CreditCard },
  { key: "attendance", label: "Presença", icon: ClipboardCheck },
  { key: "techniques", label: "Técnicas", icon: BookOpen },
  { key: "ranking", label: "Ranking", icon: Trophy },
  { key: "store", label: "Loja", icon: ShoppingBag },
  { key: "competitions", label: "Competições", icon: Medal },
  { key: "users", label: "Usuários", icon: Shield }
] as const;

const studentNav = [
  { key: "home", label: "Início", icon: Home },
  { key: "finance", label: "Financeiro", icon: CreditCard },
  { key: "techniques", label: "Técnicas", icon: BookOpen },
  { key: "ranking", label: "Ranking", icon: Trophy },
  { key: "store", label: "Loja", icon: ShoppingBag },
  { key: "competitions", label: "Competições", icon: Medal }
] as const;

type AdminTab = (typeof adminNav)[number]["key"];
type StudentTab = (typeof studentNav)[number]["key"];
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function App() {
  const [session, setSession] = useState<Session | null>(() => {
    if (new URLSearchParams(window.location.search).get("demo") === "login") {
      localStorage.removeItem(sessionKey);
      return null;
    }

    const stored = localStorage.getItem(sessionKey);
    return stored ? (JSON.parse(stored) as Session) : null;
  });

  function handleSession(next: Session | null) {
    setSession(next);
    if (next) localStorage.setItem(sessionKey, JSON.stringify(next));
    else localStorage.removeItem(sessionKey);
  }

  if (!session) return <Login onLogin={handleSession} />;

  return session.user.role === "student" ? (
    <StudentApp session={session} onLogout={() => handleSession(null)} />
  ) : (
    <AdminApp session={session} onLogout={() => handleSession(null)} />
  );
}

function Login({ onLogin }: { onLogin: (session: Session) => void }) {
  const [mode, setMode] = useState<"login" | "register" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => window.matchMedia?.("(display-mode: standalone)").matches ?? false);

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }

    function handleInstalled() {
      setInstalled(true);
      setInstallPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const session = await request<Session>("/auth/login", undefined, {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      onLogin(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  }

  async function submitRegister(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      await request("/auth/register", undefined, {
        method: "POST",
        body: JSON.stringify({ fullName, email, phone, password })
      });
      setMessage("Cadastro enviado. Aguarde aprovação do administrador.");
      setFullName("");
      setPhone("");
      setPassword("");
      setMode("login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar o cadastro.");
    } finally {
      setLoading(false);
    }
  }

  async function submitReset(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      await request("/auth/password-reset", undefined, {
        method: "POST",
        body: JSON.stringify({ email, phone })
      });
      setMessage("Solicitação enviada ao administrador.");
      setMode("login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível solicitar recuperação.");
    } finally {
      setLoading(false);
    }
  }

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setInstallPrompt(null);
  }

  return (
    <main className="login-screen grid min-h-screen place-items-center px-4 py-8">
      <Card className="login-card w-full max-w-[420px] border-royal-gold/20 p-6 sm:p-8">
        <div className="mb-8 text-center">
          <button className="login-logo-button mx-auto" type="button" aria-label="Logo Filhos do Rei BJJ">
            <img
              src="/logo-filhos-do-rei.png"
              className="login-logo-spin logo-glow rounded-full border-2 border-royal-gold object-cover"
              alt="Filhos do Rei BJJ William Lago"
            />
          </button>
          <h1 className="mt-6 text-xl font-black tracking-wide text-white">FILHOS DO REI BJJ</h1>
          <p className="mt-1 text-sm font-bold tracking-[0.14em] text-royal-gold">WILLIAM LAGO</p>
          {installPrompt && !installed && (
            <button type="button" className="pwa-install-button mx-auto mt-5" onClick={installApp}>
              <Download size={16} />
              Instalar aplicativo
            </button>
          )}
        </div>
        {mode === "login" && (
        <form className="space-y-4" onSubmit={submit}>
          <label className="block text-sm font-semibold text-zinc-200">
            Usuário ou e-mail
            <Input
              className="mt-2"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Digite Admin ou seu e-mail"
              autoComplete="username"
              required
            />
          </label>
          <label className="block text-sm font-semibold text-zinc-200">
            Senha
            <Input
              className="mt-2"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Digite sua senha"
              autoComplete="current-password"
              required
            />
          </label>
          {message && <p className="rounded-lg border border-emerald-400/40 bg-emerald-400/10 p-3 text-sm text-emerald-200">{message}</p>}
          {error && <p className="rounded-lg border border-royal-red/40 bg-royal-red/10 p-3 text-sm text-red-200">{error}</p>}
          <Button className="w-full" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
        )}
        {mode === "register" && (
          <form className="space-y-4" onSubmit={submitRegister}>
            <Input placeholder="Nome completo" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
            <Input type="email" placeholder="E-mail" value={email} onChange={(event) => setEmail(event.target.value)} required />
            <Input placeholder="Telefone com DDD" value={phone} onChange={(event) => setPhone(event.target.value)} required />
            <Input
              type="password"
              placeholder="Senha: 6 a 8 caracteres com especial"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            {error && <p className="rounded-lg border border-royal-red/40 bg-royal-red/10 p-3 text-sm text-red-200">{error}</p>}
            <Button className="w-full" disabled={loading}>
              {loading ? "Enviando..." : "Enviar cadastro"}
            </Button>
          </form>
        )}
        {mode === "reset" && (
          <form className="space-y-4" onSubmit={submitReset}>
            <Input type="email" placeholder="E-mail cadastrado" value={email} onChange={(event) => setEmail(event.target.value)} />
            <Input placeholder="Telefone com DDD" value={phone} onChange={(event) => setPhone(event.target.value)} />
            {error && <p className="rounded-lg border border-royal-red/40 bg-royal-red/10 p-3 text-sm text-red-200">{error}</p>}
            <Button className="w-full" disabled={loading}>
              {loading ? "Enviando..." : "Solicitar nova senha"}
            </Button>
          </form>
        )}
        <div className="mt-4 grid gap-2 text-center text-sm font-semibold text-royal-gold">
          {mode !== "login" && <button onClick={() => setMode("login")}>Voltar ao login</button>}
          {mode !== "register" && <button onClick={() => setMode("register")}>Cadastrar aluno</button>}
          {mode !== "reset" && <button onClick={() => setMode("reset")}>Recuperar senha</button>}
        </div>
      </Card>
    </main>
  );
}

function AdminApp({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const allowed = session.user.permissions ?? [];
  const visibleNav = adminNav.filter((item) => session.user.role === "admin" || allowed.includes(item.key));

  useEffect(() => {
    if (!visibleNav.some((item) => item.key === tab)) setTab((visibleNav[0]?.key ?? "dashboard") as AdminTab);
  }, [tab, visibleNav]);

  return (
    <Shell
      session={session}
      nav={visibleNav}
      activeTab={tab}
      onChange={(key) => setTab(key as AdminTab)}
      onLogout={onLogout}
    >
      {tab === "dashboard" && <AdminDashboardView token={session.token} />}
      {tab === "students" && <StudentsPanel token={session.token} />}
      {tab === "finance" && <FinancePanel token={session.token} isAdmin />}
      {tab === "attendance" && <AttendancePanel token={session.token} />}
      {tab === "techniques" && <TechniquesPanel token={session.token} isAdmin />}
      {tab === "ranking" && <RankingPanel token={session.token} />}
      {tab === "store" && <StorePanel token={session.token} isAdmin />}
      {tab === "competitions" && <CompetitionsPanel token={session.token} isAdmin />}
      {tab === "users" && <UsersPanel token={session.token} />}
    </Shell>
  );
}

function StudentApp({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const [tab, setTab] = useState<StudentTab>("home");

  return (
    <Shell
      session={session}
      nav={studentNav}
      activeTab={tab}
      onChange={(key) => setTab(key as StudentTab)}
      onLogout={onLogout}
    >
      {tab === "home" && <StudentDashboardView token={session.token} />}
      {tab === "finance" && <FinancePanel token={session.token} />}
      {tab === "techniques" && <TechniquesPanel token={session.token} />}
      {tab === "ranking" && <RankingPanel token={session.token} />}
      {tab === "store" && <StorePanel token={session.token} />}
      {tab === "competitions" && <CompetitionsPanel token={session.token} studentId={session.student?.id} />}
    </Shell>
  );
}

function UsersPanel({ token }: { token: string }) {
  const users = useApi<AdminUser[]>("/admin/users", token);
  const registrations = useApi<RegistrationRequest[]>("/admin/registration-requests", token);
  const resets = useApi<PasswordResetRequest[]>("/admin/password-reset-requests", token);
  const [resetPasswords, setResetPasswords] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");

  async function reviewRegistration(id: string, status: "approved" | "rejected") {
    await request(`/admin/registration-requests/${id}`, token, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
    setMessage(status === "approved" ? "Cadastro aprovado." : "Cadastro recusado.");
    registrations.reload();
    users.reload();
  }

  async function reviewReset(id: string, status: "resolved" | "rejected") {
    await request(`/admin/password-reset-requests/${id}`, token, {
      method: "PATCH",
      body: JSON.stringify({ status, newPassword: resetPasswords[id] })
    });
    setMessage(status === "resolved" ? "Senha redefinida." : "Solicitação recusada.");
    resets.reload();
  }

  return (
    <div className="space-y-5">
      <PageTitle title="Usuários e permissões" subtitle="Aprovação de cadastro, recuperação de senha e controle de acesso" />
      {message && <Card className="border-royal-gold/40 text-sm text-royal-gold">{message}</Card>}

      <Card>
        <h3 className="text-lg font-bold text-white">Cadastros pendentes</h3>
        <div className="mt-4 grid gap-3">
          {registrations.data?.filter((item) => item.status === "pending").map((item) => (
            <div key={item.id} className="rounded-lg border border-royal-line bg-black/20 p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-white">{item.full_name}</p>
                  <p className="mt-1 text-sm text-royal-muted">{item.email} · {item.phone}</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => reviewRegistration(item.id, "approved")}>Aprovar</Button>
                  <Button variant="danger" onClick={() => reviewRegistration(item.id, "rejected")}>Recusar</Button>
                </div>
              </div>
            </div>
          ))}
          {!registrations.data?.some((item) => item.status === "pending") && <EmptyState>Nenhum cadastro pendente.</EmptyState>}
        </div>
      </Card>

      <Card>
        <h3 className="text-lg font-bold text-white">Recuperação de senha</h3>
        <div className="mt-4 grid gap-3">
          {resets.data?.filter((item) => item.status === "pending").map((item) => (
            <div key={item.id} className="rounded-lg border border-royal-line bg-black/20 p-3">
              <p className="font-bold text-white">{item.user_name ?? "Usuário não localizado"}</p>
              <p className="mt-1 text-sm text-royal-muted">{item.email ?? "Sem e-mail"} · {item.phone ?? "Sem telefone"}</p>
              <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto_auto]">
                <Input
                  type="password"
                  placeholder="Nova senha: 6 a 8 com especial"
                  value={resetPasswords[item.id] ?? ""}
                  onChange={(event) => setResetPasswords({ ...resetPasswords, [item.id]: event.target.value })}
                />
                <Button onClick={() => reviewReset(item.id, "resolved")}>Redefinir</Button>
                <Button variant="danger" onClick={() => reviewReset(item.id, "rejected")}>Recusar</Button>
              </div>
            </div>
          ))}
          {!resets.data?.some((item) => item.status === "pending") && <EmptyState>Nenhuma solicitação de senha pendente.</EmptyState>}
        </div>
      </Card>

      <div className="grid gap-3">
        {users.data?.map((user) => (
          <UserPermissionCard key={user.id} token={token} user={user} onSaved={users.reload} />
        ))}
      </div>
    </div>
  );
}

function UserPermissionCard({ token, user, onSaved }: { token: string; user: AdminUser; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: user.name,
    username: user.username ?? "",
    email: user.email,
    phone: user.phone ?? "",
    role: user.role,
    permissions: user.permissions ?? []
  });
  const [saving, setSaving] = useState(false);

  function togglePermission(permission: string) {
    const permissions = form.permissions.includes(permission)
      ? form.permissions.filter((item) => item !== permission)
      : [...form.permissions, permission];
    setForm({ ...form, permissions });
  }

  async function save() {
    setSaving(true);
    try {
      await request(`/admin/users/${user.id}`, token, {
        method: "PATCH",
        body: JSON.stringify(form)
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
        <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        <Input placeholder="Usuário" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} />
        <Input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        <Select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as AdminUser["role"] })}>
          <option value="admin">Admin</option>
          <option value="teacher">Professor</option>
          <option value="finance">Financeiro</option>
          <option value="student">Aluno</option>
        </Select>
      </div>
      <Input className="mt-3" placeholder="Telefone" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
      <div className="mt-4 flex flex-wrap gap-2">
        {permissionOptions.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => togglePermission(key)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              form.permissions.includes(key) ? "border-royal-gold bg-royal-gold text-black" : "border-royal-line bg-white/5 text-zinc-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <Badge tone="gold">{roleLabel(form.role)}</Badge>
        <Button disabled={saving} onClick={save}>
          <Save size={16} /> {saving ? "Salvando..." : "Salvar permissões"}
        </Button>
      </div>
    </Card>
  );
}

function Shell({
  session,
  nav,
  activeTab,
  onChange,
  onLogout,
  children
}: {
  session: Session;
  nav: readonly { key: string; label: string; icon: React.ElementType }[];
  activeTab: string;
  onChange: (key: string) => void;
  onLogout: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="brand-panel border-b border-royal-gold/20 bg-black/70 p-4 backdrop-blur lg:min-h-screen lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 lg:block">
          <Logo />
          <Button variant="ghost" className="lg:hidden" onClick={onLogout} aria-label="Sair">
            <LogOut size={16} />
          </Button>
        </div>
        <nav className="mt-5 flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onChange(item.key)}
                className={`flex min-h-11 shrink-0 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition lg:w-full ${
                  active
                    ? "bg-royal-gold text-black"
                    : "border border-transparent text-zinc-300 hover:border-royal-line hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="mt-6 hidden rounded-lg border border-royal-gold/20 bg-black/35 p-3 lg:block">
          <p className="text-xs uppercase tracking-wider text-royal-muted">Sessão</p>
          <p className="mt-2 text-sm font-bold text-white">{session.user.name}</p>
          <p className="text-xs text-royal-muted">{roleLabel(session.user.role)}</p>
          <Button variant="ghost" className="mt-4 w-full" onClick={onLogout}>
            <LogOut size={16} /> Sair
          </Button>
        </div>
      </aside>
      <main className="px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}

function AdminDashboardView({ token }: { token: string }) {
  const { data, loading, error } = useApi<AdminDashboard>("/admin/dashboard", token);

  if (loading) return <Loading title="Carregando dashboard" />;
  if (error) return <ErrorBox message={error} />;
  if (!data) return null;

  const maxXp = Math.max(...data.evolution.map((item) => item.xp), 1);
  const paymentTotal = Math.max(data.payments.reduce((sum, item) => sum + item.total, 0), 1);

  return (
    <div className="space-y-5">
      <PageTitle title="Dashboard administrativo" subtitle="Indicadores rápidos da academia" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={<Users />} label="Alunos ativos" value={data.cards.activeStudents} />
        <StatCard icon={<CreditCard />} label="Receita mensal" value={formatMoney(data.cards.monthlyRevenue)} />
        <StatCard icon={<Shield />} label="Inadimplentes" value={data.cards.overduePayments} danger />
        <StatCard icon={<CalendarCheck />} label="Treinos no mês" value={data.cards.monthlyAttendance} />
        <StatCard icon={<UserPlus />} label="Novos alunos" value={data.cards.newStudents} />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.3fr_.7fr]">
        <Card>
          <h3 className="text-lg font-bold text-white">Evolução de XP</h3>
          <div className="mt-5 flex h-56 items-end gap-3">
            {data.evolution.map((item) => (
              <div key={item.label} className="flex flex-1 flex-col items-center gap-2">
                <div className="w-full rounded-t-lg bg-royal-gold" style={{ height: `${Math.max(8, (item.xp / maxXp) * 100)}%` }} />
                <span className="text-xs text-royal-muted">{item.label}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="text-lg font-bold text-white">Pagamentos</h3>
          <div className="mt-5 space-y-4">
            {data.payments.map((item) => (
              <div key={item.status}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-300">{paymentStatus(item.status)}</span>
                  <span className="font-bold text-white">{item.total}</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-black/40">
                  <div
                    className={`h-2 rounded-full ${item.status === "overdue" ? "bg-royal-red" : item.status === "paid" ? "bg-emerald-400" : "bg-royal-gold"}`}
                    style={{ width: `${(item.total / paymentTotal) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function StudentsPanel({ token }: { token: string }) {
  const { data, loading, error, reload } = useApi<Student[]>("/students", token);
  const [form, setForm] = useState(emptyStudentForm);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function createStudent(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await request<Student>(editingStudentId ? `/students/${editingStudentId}` : "/students", token, {
        method: editingStudentId ? "PUT" : "POST",
        body: JSON.stringify(form)
      });
      setForm(emptyStudentForm);
      setEditingStudentId(null);
      reload();
    } finally {
      setSaving(false);
    }
  }

  function editStudent(student: Student) {
    setEditingStudentId(student.id);
    setForm({
      fullName: student.full_name,
      email: student.email ?? "",
      phone: student.phone ?? "",
      belt: student.belt,
      stripeCount: Number(student.stripe_count ?? 0),
      classesUntilNextStripe: Number(student.classes_until_next_stripe ?? 0),
      goals: student.goals ?? "",
      status: student.status ?? "active"
    });
  }

  function cancelEdit() {
    setEditingStudentId(null);
    setForm(emptyStudentForm);
  }

  async function removeStudent(id: string) {
    await request(`/students/${id}`, token, { method: "DELETE" });
    reload();
  }

  return (
    <div className="space-y-5">
      <PageTitle title="Gestão de alunos" subtitle="Cadastro, faixa, graus, frequência e status financeiro" />
      <Card>
        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-7" onSubmit={createStudent}>
          <Input placeholder="Nome completo" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
          <Input
            placeholder="E-mail"
            type="email"
            value={form.email}
            disabled={Boolean(editingStudentId)}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input placeholder="Telefone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Select value={form.belt} onChange={(e) => setForm({ ...form, belt: e.target.value })}>
            {beltOptions.map((belt) => (
              <option key={belt}>{belt}</option>
            ))}
          </Select>
          <Select value={form.stripeCount} onChange={(e) => setForm({ ...form, stripeCount: Number(e.target.value) })}>
            {[0, 1, 2, 3, 4].map((stripe) => (
              <option key={stripe} value={stripe}>
                {stripe} grau{stripe === 1 ? "" : "s"}
              </option>
            ))}
          </Select>
          <Input
            min={0}
            type="number"
            placeholder="Aulas p/ grau"
            value={form.classesUntilNextStripe}
            onChange={(e) => setForm({ ...form, classesUntilNextStripe: Number(e.target.value) })}
          />
          <Button disabled={saving}>
            {editingStudentId ? <Save size={16} /> : <Plus size={16} />}
            {editingStudentId ? "Salvar" : "Cadastrar"}
          </Button>
          {editingStudentId && (
            <Button type="button" variant="ghost" className="xl:col-start-7" onClick={cancelEdit}>
              Cancelar
            </Button>
          )}
        </form>
      </Card>
      {loading && <Loading title="Carregando alunos" />}
      {error && <ErrorBox message={error} />}
      {data && (
        <div className="grid gap-3">
          {data.map((student) => (
            <Card key={student.id} className="grid gap-4 md:grid-cols-[auto_1fr_auto_auto] md:items-center">
              <Avatar src={student.photo_url} name={student.full_name} />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-white">{student.full_name}</h3>
                  <Badge tone="gold">{student.belt}</Badge>
                  <Badge>{student.stripe_count} grau{Number(student.stripe_count) === 1 ? "" : "s"}</Badge>
                  {statusBadge(student.payment_status)}
                </div>
                <p className="mt-1 text-sm text-royal-muted">
                  {student.phone || "Sem telefone"} · {Number(student.monthly_attendance ?? 0)} treinos no mês · Nível {student.level}
                </p>
              </div>
              <BeltProgress belt={student.belt} stripes={student.stripe_count} remaining={student.classes_until_next_stripe} compact />
              <div className="flex flex-wrap gap-2 md:justify-end">
                <Button variant="ghost" onClick={() => editStudent(student)}>
                  <Pencil size={16} /> Editar
                </Button>
                <Button variant="danger" onClick={() => removeStudent(student.id)}>
                  Remover
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function StudentDashboardView({ token }: { token: string }) {
  const { data, loading, error, reload } = useApi<StudentDashboard>("/student/dashboard", token);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [checkinMessage, setCheckinMessage] = useState("");
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoMessage, setPhotoMessage] = useState("");

  useEffect(() => {
    if (data?.checkin?.status !== "pending") return;
    const interval = window.setInterval(reload, 5000);
    return () => window.clearInterval(interval);
  }, [data?.checkin?.status, reload]);

  if (loading) return <Loading title="Carregando área do aluno" />;
  if (error) return <ErrorBox message={error} />;
  if (!data) return null;

  const activeCheckin = data.checkin?.class_id === data.nextClass?.id ? data.checkin : null;

  async function requestCheckin() {
    if (!data?.nextClass) return;

    setCheckinLoading(true);
    setCheckinMessage("");
    try {
      await request("/student/checkins", token, {
        method: "POST",
        body: JSON.stringify({ classId: data.nextClass.id })
      });
      setCheckinMessage("Check-in enviado ao professor para validação.");
      reload();
    } catch (err) {
      setCheckinMessage(err instanceof Error ? err.message : "Não foi possível enviar o check-in.");
    } finally {
      setCheckinLoading(false);
    }
  }

  async function updateProfilePhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    setPhotoLoading(true);
    setPhotoMessage("");
    try {
      const photoUrl = await imageFileToProfileDataUrl(file);
      await request("/student/photo", token, {
        method: "PATCH",
        body: JSON.stringify({ photoUrl })
      });
      setPhotoMessage("Foto atualizada.");
      reload();
    } catch (err) {
      setPhotoMessage(err instanceof Error ? err.message : "Não foi possível atualizar a foto.");
    } finally {
      setPhotoLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageTitle title={`Olá, ${data.student.full_name.split(" ")[0]}`} subtitle="Sua evolução no tatame" />
      <Card className="grid gap-5 md:grid-cols-[auto_1fr_auto] md:items-center">
        <div className="space-y-2">
          <Avatar src={data.student.photo_url} name={data.student.full_name} size="lg" />
          <label className="inline-flex min-h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[.03] px-3 text-xs font-semibold text-white transition hover:border-royal-gold hover:text-royal-gold">
            <Camera size={14} />
            {photoLoading ? "Enviando..." : "Foto"}
            <input className="hidden" type="file" accept="image/*" disabled={photoLoading} onChange={updateProfilePhoto} />
          </label>
          {photoMessage && <p className="max-w-28 text-xs text-royal-gold">{photoMessage}</p>}
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-black text-white">{data.student.full_name}</h2>
            <Badge tone="gold">{data.student.belt} · {data.student.stripe_count} graus</Badge>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300">{data.student.goals}</p>
        </div>
        <div className="rounded-lg border border-royal-gold/30 bg-royal-gold/10 p-4 text-center">
          <p className="text-xs uppercase tracking-wider text-royal-gold">Nível</p>
          <p className="text-4xl font-black text-white">{data.student.level}</p>
          <p className="text-sm text-zinc-300">{data.student.xp} XP</p>
        </div>
        <div className="md:col-span-3">
          <BeltProgress
            belt={data.student.belt}
            stripes={data.student.stripe_count}
            remaining={data.student.classes_until_next_stripe}
          />
        </div>
      </Card>
      <Card className={activeCheckin?.status === "approved" && activeCheckin.xp_awarded > 0 ? "xp-confirmed" : ""}>
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold text-white">Check-in de treino</h3>
              {activeCheckin?.status === "pending" && <Badge tone="gold">Aguardando professor</Badge>}
              {activeCheckin?.status === "approved" && <Badge tone="green">Treino validado</Badge>}
              {activeCheckin?.status === "rejected" && <Badge tone="red">Revisar com professor</Badge>}
            </div>
            <p className="mt-2 text-sm text-zinc-300">
              {data.nextClass
                ? `${data.nextClass.title} · ${formatDateTime(data.nextClass.class_date)}`
                : "Nenhuma aula disponível para check-in."}
            </p>
            {activeCheckin?.status === "approved" && activeCheckin.xp_awarded > 0 && (
              <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-royal-gold/40 bg-royal-gold/10 px-4 py-3 text-royal-gold">
                <SparkXp /> <span className="text-sm font-black">+{activeCheckin.xp_awarded} XP confirmado</span>
              </div>
            )}
            {activeCheckin?.status === "pending" && (
              <p className="mt-3 text-sm text-royal-muted">Sua solicitação foi enviada. A presença só vale depois da confirmação do professor.</p>
            )}
            {checkinMessage && <p className="mt-3 text-sm text-royal-gold">{checkinMessage}</p>}
          </div>
          <Button
            disabled={!data.nextClass || checkinLoading || activeCheckin?.status === "pending" || activeCheckin?.status === "approved"}
            onClick={requestCheckin}
          >
            <Clock size={16} /> {checkinLoading ? "Enviando..." : "Fazer check-in"}
          </Button>
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<CalendarCheck />} label="Treinos no mês" value={data.monthlyAttendance} />
        <StatCard icon={<Trophy />} label="Posição geral" value={data.rankingPosition ? `#${data.rankingPosition}` : "-"} />
        <StatCard icon={<CreditCard />} label="Mensalidade" value={paymentStatus(data.payment?.status)} danger={data.payment?.status === "overdue"} />
        <StatCard icon={<BookOpen />} label="Técnicas" value={`${data.techniqueSummary.reduce((sum, item) => sum + item.total, 0)}`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="text-lg font-bold text-white">Próxima aula</h3>
          {data.nextClass ? (
            <div className="mt-4 rounded-lg border border-royal-line bg-black/25 p-4">
              <p className="font-bold text-white">{data.nextClass.title}</p>
              <p className="mt-1 text-sm text-royal-muted">{formatDateTime(data.nextClass.class_date)}</p>
              <p className="mt-3 text-sm text-zinc-300">{data.nextClass.focus}</p>
            </div>
          ) : (
            <EmptyState>Nenhuma aula futura cadastrada.</EmptyState>
          )}
        </Card>
        <Card>
          <h3 className="text-lg font-bold text-white">Objetivo mensal</h3>
          <div className="mt-4 h-3 rounded-full bg-black/40">
            <div className="h-3 rounded-full bg-royal-gold" style={{ width: `${Math.min(100, (data.monthlyAttendance / 12) * 100)}%` }} />
          </div>
          <p className="mt-3 text-sm text-zinc-300">{data.monthlyAttendance} de 12 treinos planejados no mês.</p>
        </Card>
      </div>
    </div>
  );
}

function FinancePanel({ token, isAdmin = false }: { token: string; isAdmin?: boolean }) {
  if (isAdmin) return <BusinessFinancePanel token={token} />;

  const students = useApi<Student[]>(isAdmin ? "/students" : null, token);
  const [studentId, setStudentId] = useState("");
  const path = isAdmin ? (studentId ? `/student/finance?studentId=${studentId}` : null) : "/student/finance";
  const { data, loading, error, reload } = useApi<Payment[]>(path, token);

  useEffect(() => {
    if (isAdmin && students.data?.[0] && !studentId) setStudentId(students.data[0].id);
  }, [isAdmin, studentId, students.data]);

  async function updatePayment(id: string, status: Payment["status"]) {
    await request(`/payments/${id}/status`, token, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
    reload();
  }

  return (
    <div className="space-y-5">
      <PageTitle title="Financeiro" subtitle="Mensalidades, vencimentos, PIX e histórico" />
      {isAdmin && (
        <Card>
          <Select value={studentId} onChange={(event) => setStudentId(event.target.value)}>
            {students.data?.map((student) => (
              <option value={student.id} key={student.id}>
                {student.full_name}
              </option>
            ))}
          </Select>
        </Card>
      )}
      {loading && <Loading title="Carregando financeiro" />}
      {error && <ErrorBox message={error} />}
      <div className="grid gap-3">
        {data?.map((payment) => (
          <Card key={payment.id} className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-white">{payment.reference_month}</h3>
                {statusBadge(payment.status)}
              </div>
              <p className="mt-1 text-sm text-royal-muted">
                Vencimento {formatDate(payment.due_date)} · {formatMoney(payment.value)}
              </p>
              <code className="mt-3 block rounded-lg border border-royal-line bg-black/35 p-3 text-xs text-zinc-300">{payment.pix_code}</code>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={() => navigator.clipboard?.writeText(payment.pix_code)}>
                Copiar PIX
              </Button>
              {isAdmin && (
                <>
                  <Button onClick={() => updatePayment(payment.id, "paid")}>
                    <Save size={16} /> Pago
                  </Button>
                  <Button variant="danger" onClick={() => updatePayment(payment.id, "overdue")}>
                    Atrasado
                  </Button>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function BusinessFinancePanel({ token }: { token: string }) {
  const summary = useApi<FinanceSummary>("/finance/summary", token);
  const entries = useApi<FinanceEntry[]>("/finance/entries", token);
  const [form, setForm] = useState({
    type: "expense",
    category: "Aluguel",
    description: "",
    amount: "",
    entryDate: new Date().toISOString().slice(0, 10),
    status: "paid",
    paymentMethod: "PIX",
    notes: ""
  });
  const [reportMessage, setReportMessage] = useState("");

  async function createEntry(event: React.FormEvent) {
    event.preventDefault();
    await request("/finance/entries", token, {
      method: "POST",
      body: JSON.stringify({ ...form, amount: Number(form.amount) })
    });
    setForm({ ...form, description: "", amount: "", notes: "" });
    summary.reload();
    entries.reload();
  }

  async function updateEntryStatus(id: string, status: "paid" | "pending") {
    await request(`/finance/entries/${id}/status`, token, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
    summary.reload();
    entries.reload();
  }

  async function removeEntry(id: string) {
    await request(`/finance/entries/${id}`, token, { method: "DELETE" });
    summary.reload();
    entries.reload();
  }

  async function downloadReport(format: "xlsx" | "pdf" | "docx") {
    setReportMessage("");
    const response = await fetch(`${API_URL}/finance/report/${format}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      setReportMessage("Não foi possível gerar o relatório.");
      return;
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-financeiro-filhos-do-rei.${format}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function sendWhatsAppReport() {
    if (!summary.data) return;

    const text = [
      "Relatório financeiro - Filhos do Rei BJJ",
      `Receitas do mês: ${formatMoney(summary.data.income)}`,
      `Gastos do mês: ${formatMoney(summary.data.expenses)}`,
      `Lucro líquido: ${formatMoney(summary.data.profit)}`,
      `Mensalidades a receber: ${formatMoney(summary.data.receivable)}`,
      `Lançamentos cadastrados: ${entries.data?.length ?? 0}`
    ].join("\n");

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-5">
      <PageTitle title="Financeiro geral" subtitle="Receitas, gastos, lucro líquido e lançamentos livres da academia" />
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-white">Relatórios</h3>
            <p className="mt-1 text-sm text-royal-muted">Exporte o financeiro ou envie um resumo direto para o WhatsApp.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => downloadReport("xlsx")}>
              <FileSpreadsheet size={16} /> Excel
            </Button>
            <Button variant="ghost" onClick={() => downloadReport("pdf")}>
              <FileText size={16} /> PDF
            </Button>
            <Button variant="ghost" onClick={() => downloadReport("docx")}>
              <FileText size={16} /> Word
            </Button>
            <Button onClick={sendWhatsAppReport} disabled={!summary.data}>
              <MessageCircle size={16} /> WhatsApp
            </Button>
          </div>
        </div>
        {reportMessage && <p className="mt-3 text-sm text-royal-gold">{reportMessage}</p>}
      </Card>
      {summary.data && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={<CreditCard />} label="Receitas do mês" value={formatMoney(summary.data.income)} />
          <StatCard icon={<CreditCard />} label="Gastos do mês" value={formatMoney(summary.data.expenses)} danger />
          <StatCard icon={<Trophy />} label="Lucro líquido" value={formatMoney(summary.data.profit)} danger={summary.data.profit < 0} />
          <StatCard icon={<Shield />} label="Mensalidades a receber" value={formatMoney(summary.data.receivable)} />
        </div>
      )}

      <Card>
        <h3 className="mb-4 text-lg font-bold text-white">Novo lançamento</h3>
        <form className="grid gap-3 lg:grid-cols-8" onSubmit={createEntry}>
          <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="expense">Despesa</option>
            <option value="income">Receita</option>
          </Select>
          <Input placeholder="Categoria" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required />
          <Input className="lg:col-span-2" placeholder="Descrição" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          <Input type="number" step="0.01" placeholder="Valor" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
          <Input type="date" value={form.entryDate} onChange={(e) => setForm({ ...form, entryDate: e.target.value })} required />
          <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="paid">Pago/recebido</option>
            <option value="pending">Pendente</option>
          </Select>
          <Button>
            <Plus size={16} /> Lançar
          </Button>
        </form>
      </Card>

      {entries.loading && <Loading title="Carregando lançamentos" />}
      {entries.error && <ErrorBox message={entries.error} />}
      <div className="grid gap-3">
        {entries.data?.map((entry) => (
          <Card key={entry.id} className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={entry.type === "income" ? "green" : "red"}>{entry.type === "income" ? "Receita" : "Despesa"}</Badge>
                <Badge tone={entry.status === "paid" ? "green" : "gold"}>{entry.status === "paid" ? "Pago" : "Pendente"}</Badge>
                <h3 className="font-bold text-white">{entry.description}</h3>
              </div>
              <p className="mt-1 text-sm text-royal-muted">
                {entry.category} · {formatDate(entry.entry_date)} · {entry.payment_method || "Sem método"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <p className={`mr-2 text-lg font-black ${entry.type === "income" ? "text-emerald-300" : "text-royal-red"}`}>
                {entry.type === "income" ? "+" : "-"} {formatMoney(entry.amount)}
              </p>
              <Button variant="ghost" onClick={() => updateEntryStatus(entry.id, entry.status === "paid" ? "pending" : "paid")}>
                {entry.status === "paid" ? "Marcar pendente" : "Marcar pago"}
              </Button>
              <Button variant="danger" onClick={() => removeEntry(entry.id)}>
                Remover
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AttendancePanel({ token }: { token: string }) {
  const classes = useApi<ClassItem[]>("/classes", token);
  const students = useApi<Student[]>("/students", token);
  const checkins = useApi<CheckinRequest[]>("/checkin-requests?status=pending", token);
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (classes.data?.[0] && !classId) setClassId(classes.data[0].id);
    if (students.data?.[0] && !studentId) setStudentId(students.data[0].id);
  }, [classes.data, students.data, classId, studentId]);

  async function registerAttendance(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    const result = await request<{ registered: boolean }>("/attendance", token, {
      method: "POST",
      body: JSON.stringify({ classId, studentId })
    });
    setMessage(result.registered ? "Presença registrada e +50 XP aplicado." : "Presença já estava registrada.");
    classes.reload();
  }

  async function reviewCheckin(id: string, status: "approved" | "rejected") {
    const result = await request<{ xp_awarded: number }>(`/checkin-requests/${id}`, token, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
    setMessage(
      status === "approved"
        ? `Check-in confirmado. +${result.xp_awarded} XP aplicado ao aluno.`
        : "Check-in recusado."
    );
    checkins.reload();
    classes.reload();
  }

  return (
    <div className="space-y-5">
      <PageTitle title="Controle de treinos" subtitle="Aulas, presença e frequência mensal" />
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-white">Check-ins aguardando confirmação</h3>
            <p className="mt-1 text-sm text-royal-muted">Solicitações enviadas pelos alunos para validação do treino.</p>
          </div>
          <Badge tone="gold">{checkins.data?.length ?? 0} pendentes</Badge>
        </div>
        <div className="mt-4 grid gap-3">
          {checkins.loading && <p className="text-sm text-royal-muted">Carregando solicitações...</p>}
          {!checkins.loading && checkins.data?.length === 0 && <EmptyState>Nenhum check-in pendente.</EmptyState>}
          {checkins.data?.map((item) => (
            <div key={item.id} className="grid gap-3 rounded-lg border border-royal-line bg-black/25 p-3 md:grid-cols-[auto_1fr_auto] md:items-center">
              <Avatar src={item.photo_url} name={item.full_name} />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-white">{item.full_name}</p>
                  <Badge tone="gold">{item.belt}</Badge>
                </div>
                <p className="mt-1 text-sm text-royal-muted">
                  {item.title} · {formatDateTime(item.class_date)} · solicitado {formatDateTime(item.requested_at)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => reviewCheckin(item.id, "approved")}>
                  <CheckCircle2 size={16} /> Confirmar +50 XP
                </Button>
                <Button variant="danger" onClick={() => reviewCheckin(item.id, "rejected")}>
                  Recusar
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <form className="grid gap-3 md:grid-cols-[1fr_1fr_auto]" onSubmit={registerAttendance}>
          <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
            {classes.data?.map((item) => (
              <option value={item.id} key={item.id}>
                {item.title} · {formatDateTime(item.class_date)}
              </option>
            ))}
          </Select>
          <Select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            {students.data?.map((student) => (
              <option value={student.id} key={student.id}>
                {student.full_name}
              </option>
            ))}
          </Select>
          <Button>
            <ClipboardCheck size={16} /> Registrar
          </Button>
        </form>
        {message && <p className="mt-3 text-sm text-royal-gold">{message}</p>}
      </Card>
      <div className="grid gap-3">
        {classes.data?.map((item) => (
          <Card key={item.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-white">{item.title}</h3>
                <p className="mt-1 text-sm text-royal-muted">{formatDateTime(item.class_date)} · {item.teacher_name}</p>
              </div>
              <Badge tone="gold">{item.attendees} presenças</Badge>
            </div>
            <p className="mt-3 text-sm text-zinc-300">{item.focus}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

function TechniquesPanel({ token, isAdmin = false }: { token: string; isAdmin?: boolean }) {
  const students = useApi<Student[]>(isAdmin ? "/students" : null, token);
  const [studentId, setStudentId] = useState("");
  const path = isAdmin ? (studentId ? `/techniques?studentId=${studentId}` : null) : "/techniques";
  const { data, loading, error, reload } = useApi<Technique[]>(path, token);
  const [editingTechniqueId, setEditingTechniqueId] = useState("");
  const [techniqueForm, setTechniqueForm] = useState({
    category: "Guarda Fechada",
    name: "",
    description: "",
    videoUrl: "",
    notes: ""
  });
  const grouped = useMemo(() => groupBy(data ?? [], (item) => item.category), [data]);

  useEffect(() => {
    if (isAdmin && students.data?.[0] && !studentId) setStudentId(students.data[0].id);
  }, [isAdmin, studentId, students.data]);

  async function updateStatus(techniqueId: string, status: Technique["status"]) {
    await request(`/techniques/${techniqueId}/status`, token, {
      method: "PATCH",
      body: JSON.stringify({ studentId, status })
    });
    reload();
  }

  async function saveTechnique(event: React.FormEvent) {
    event.preventDefault();
    await request(editingTechniqueId ? `/techniques/${editingTechniqueId}` : "/techniques", token, {
      method: editingTechniqueId ? "PUT" : "POST",
      body: JSON.stringify(techniqueForm)
    });
    setEditingTechniqueId("");
    setTechniqueForm({ category: "Guarda Fechada", name: "", description: "", videoUrl: "", notes: "" });
    reload();
  }

  function editTechnique(technique: Technique) {
    setEditingTechniqueId(technique.id);
    setTechniqueForm({
      category: technique.category,
      name: technique.name,
      description: technique.description ?? "",
      videoUrl: technique.video_url ?? "",
      notes: technique.notes ?? ""
    });
  }

  async function removeTechnique(id: string) {
    await request(`/techniques/${id}`, token, { method: "DELETE" });
    reload();
  }

  return (
    <div className="space-y-5">
      <PageTitle title="Técnicas e evolução" subtitle="Categorias, status técnico e acompanhamento por aluno" />
      {isAdmin && (
        <Card className="space-y-4">
          <Select value={studentId} onChange={(event) => setStudentId(event.target.value)}>
            {students.data?.map((student) => (
              <option value={student.id} key={student.id}>
                {student.full_name}
              </option>
            ))}
          </Select>
          <form className="grid gap-3 lg:grid-cols-6" onSubmit={saveTechnique}>
            <Input placeholder="Categoria" value={techniqueForm.category} onChange={(e) => setTechniqueForm({ ...techniqueForm, category: e.target.value })} required />
            <Input placeholder="Nome da técnica" value={techniqueForm.name} onChange={(e) => setTechniqueForm({ ...techniqueForm, name: e.target.value })} required />
            <Input className="lg:col-span-2" placeholder="Descrição" value={techniqueForm.description} onChange={(e) => setTechniqueForm({ ...techniqueForm, description: e.target.value })} />
            <Input placeholder="URL do vídeo" value={techniqueForm.videoUrl} onChange={(e) => setTechniqueForm({ ...techniqueForm, videoUrl: e.target.value })} />
            <Button>
              <Save size={16} /> {editingTechniqueId ? "Salvar" : "Adicionar"}
            </Button>
            <Input className="lg:col-span-5" placeholder="Observações do professor" value={techniqueForm.notes} onChange={(e) => setTechniqueForm({ ...techniqueForm, notes: e.target.value })} />
            {editingTechniqueId && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setEditingTechniqueId("");
                  setTechniqueForm({ category: "Guarda Fechada", name: "", description: "", videoUrl: "", notes: "" });
                }}
              >
                Cancelar edição
              </Button>
            )}
          </form>
        </Card>
      )}
      {loading && <Loading title="Carregando técnicas" />}
      {error && <ErrorBox message={error} />}
      <div className="grid gap-4 lg:grid-cols-2">
        {Object.entries(grouped).map(([category, items]) => (
          <Card key={category}>
            <h3 className="text-lg font-bold text-white">{category}</h3>
            <div className="mt-4 space-y-3">
              {items.map((technique) => (
                <div key={technique.id} className="rounded-lg border border-royal-line bg-black/20 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-white">{technique.name}</p>
                      <p className="mt-1 text-sm text-royal-muted">{technique.description}</p>
                      {technique.notes && <p className="mt-2 text-sm text-zinc-300">Obs: {technique.notes}</p>}
                      {technique.video_url && (
                        <a className="mt-2 inline-flex text-sm font-semibold text-royal-gold hover:text-yellow-200" href={technique.video_url} target="_blank" rel="noreferrer">
                          Ver vídeo da técnica
                        </a>
                      )}
                    </div>
                    {techniqueBadge(technique.status)}
                  </div>
                  {isAdmin && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button variant="ghost" className="min-h-8 px-3 text-xs" onClick={() => editTechnique(technique)}>
                        Editar
                      </Button>
                      {(["learned", "developing", "not_learned"] as const).map((status) => (
                        <Button key={status} variant="ghost" className="min-h-8 px-3 text-xs" onClick={() => updateStatus(technique.id, status)}>
                          {techniqueStatus(status)}
                        </Button>
                      ))}
                      <Button variant="danger" className="min-h-8 px-3 text-xs" onClick={() => removeTechnique(technique.id)}>
                        Remover
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function RankingPanel({ token }: { token: string }) {
  const [scope, setScope] = useState("monthly");
  const { data, loading, error } = useApi<RankingItem[]>(`/ranking?scope=${scope}`, token);

  return (
    <div className="space-y-5">
      <PageTitle title="Ranking" subtitle="Frequência, XP e posição dos alunos" />
      <Card className="flex flex-wrap gap-2">
        {[
          ["weekly", "Semanal"],
          ["monthly", "Mensal"],
          ["general", "Geral"]
        ].map(([key, label]) => (
          <Button key={key} variant={scope === key ? "primary" : "ghost"} onClick={() => setScope(key)}>
            {label}
          </Button>
        ))}
      </Card>
      {loading && <Loading title="Carregando ranking" />}
      {error && <ErrorBox message={error} />}
      <div className="grid gap-3">
        {data?.map((item) => (
          <Card key={item.id} className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-3">
            <span className="text-2xl font-black text-royal-gold">#{item.position}</span>
            <Avatar src={item.photo_url} name={item.full_name} />
            <div>
              <h3 className="font-bold text-white">{item.full_name}</h3>
              <p className="text-sm text-royal-muted">{item.belt} · Nível {item.level} · {item.xp} XP</p>
            </div>
            <Badge tone="gold">{item.trainings} treinos</Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}

function StorePanel({ token, isAdmin = false }: { token: string; isAdmin?: boolean }) {
  const { data, loading, error, reload } = useApi<Product[]>("/products", token);
  const [editingProductId, setEditingProductId] = useState("");
  const [saleQuantities, setSaleQuantities] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ name: "", category: "Kimono", price: "", stock: "", imageUrl: "", available: true });

  async function createProduct(event: React.FormEvent) {
    event.preventDefault();
    await request(editingProductId ? `/products/${editingProductId}` : "/products", token, {
      method: editingProductId ? "PUT" : "POST",
      body: JSON.stringify({ ...form, price: Number(form.price), stock: Number(form.stock) })
    });
    setEditingProductId("");
    setForm({ name: "", category: "Kimono", price: "", stock: "", imageUrl: "", available: true });
    reload();
  }

  function editProduct(product: Product) {
    setEditingProductId(product.id);
    setForm({
      name: product.name,
      category: product.category,
      price: String(product.price),
      stock: String(product.stock),
      imageUrl: product.image_url ?? "",
      available: product.available
    });
  }

  async function updateAvailability(product: Product, available: boolean, stock?: number) {
    await request(`/products/${product.id}/availability`, token, {
      method: "PATCH",
      body: JSON.stringify({ available, stock })
    });
    reload();
  }

  async function sellProduct(product: Product) {
    const quantity = Number(saleQuantities[product.id] || 1);
    const result = await request<{ stock: number }>(`/products/${product.id}/sell`, token, {
      method: "POST",
      body: JSON.stringify({ quantity, status: "paid" })
    });
    setMessage(`Venda registrada. Estoque atual: ${result.stock}. Receita lançada no financeiro.`);
    reload();
  }

  return (
    <div className="space-y-5">
      <PageTitle title="Loja da academia" subtitle="Produtos, estoque, disponibilidade e vendas vinculadas ao financeiro" />
      {isAdmin && (
        <Card>
          <form className="grid gap-3 md:grid-cols-6" onSubmit={createProduct}>
            <Input placeholder="Produto" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {["Kimono", "Rashguard", "Camiseta", "Acessório"].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </Select>
            <Input placeholder="Preço" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            <Input placeholder="Estoque" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} required />
            <Input placeholder="Imagem URL" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
            <Button>
              <Save size={16} /> {editingProductId ? "Salvar" : "Produto"}
            </Button>
            <Select className="md:col-span-2" value={String(form.available)} onChange={(e) => setForm({ ...form, available: e.target.value === "true" })}>
              <option value="true">Disponível</option>
              <option value="false">Indisponível</option>
            </Select>
            {editingProductId && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setEditingProductId("");
                  setForm({ name: "", category: "Kimono", price: "", stock: "", imageUrl: "", available: true });
                }}
              >
                Cancelar edição
              </Button>
            )}
          </form>
        </Card>
      )}
      {message && <Card className="border-royal-gold/40 text-sm text-royal-gold">{message}</Card>}
      {loading && <Loading title="Carregando loja" />}
      {error && <ErrorBox message={error} />}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data?.map((product) => (
          <Card key={product.id} className="overflow-hidden p-0">
            <img className="h-48 w-full object-cover" src={product.image_url || "/icon.svg"} alt="" />
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Badge tone="gold">{product.category}</Badge>
                  <h3 className="mt-3 text-lg font-bold text-white">{product.name}</h3>
                </div>
                <p className="font-black text-royal-gold">{formatMoney(product.price)}</p>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge tone={product.available && product.stock > 0 ? "green" : "red"}>
                  {product.available && product.stock > 0 ? "Disponível" : "Sem estoque"}
                </Badge>
                <span className="text-sm text-royal-muted">Estoque: {product.stock} unidades</span>
              </div>
              <code className="mt-3 block rounded-lg border border-royal-line bg-black/35 p-3 text-xs text-zinc-300">{product.pix_code}</code>
              {isAdmin ? (
                <div className="mt-4 space-y-2">
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <Input
                      min={1}
                      max={product.stock}
                      type="number"
                      value={saleQuantities[product.id] ?? "1"}
                      onChange={(e) => setSaleQuantities({ ...saleQuantities, [product.id]: e.target.value })}
                    />
                    <Button disabled={!product.available || product.stock <= 0} onClick={() => sellProduct(product)}>
                      <ShoppingBag size={16} /> Vender
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="ghost" onClick={() => editProduct(product)}>
                      Editar
                    </Button>
                    <Button variant="ghost" onClick={() => updateAvailability(product, false, 0)}>
                      Sem estoque
                    </Button>
                    <Button variant="ghost" onClick={() => updateAvailability(product, !product.available)}>
                      {product.available ? "Indisponível" : "Disponibilizar"}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button className="mt-4 w-full" disabled={!product.available || product.stock <= 0}>
                  <ShoppingBag size={16} /> Comprar via PIX
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CompetitionsPanel({ token, studentId, isAdmin = false }: { token: string; studentId?: string; isAdmin?: boolean }) {
  const { data, loading, error, reload } = useApi<Competition[]>("/competitions", token);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState({
    name: "",
    eventDate: new Date().toISOString().slice(0, 10),
    location: "",
    registrationFee: "",
    status: "open"
  });

  async function confirm(id: string) {
    await request(`/competitions/${id}/confirm`, token, {
      method: "POST",
      body: JSON.stringify({ studentId })
    });
    setMessage("Participação confirmada.");
    reload();
  }

  async function saveCompetition(event: React.FormEvent) {
    event.preventDefault();
    await request(editingId ? `/competitions/${editingId}` : "/competitions", token, {
      method: editingId ? "PUT" : "POST",
      body: JSON.stringify({ ...form, registrationFee: Number(form.registrationFee) })
    });
    setEditingId("");
    setForm({ name: "", eventDate: new Date().toISOString().slice(0, 10), location: "", registrationFee: "", status: "open" });
    reload();
  }

  function editCompetition(item: Competition) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      eventDate: item.event_date.slice(0, 10),
      location: item.location,
      registrationFee: String(item.registration_fee),
      status: item.status || "open"
    });
  }

  async function updateCompetitionStatus(id: string, status: string) {
    await request(`/competitions/${id}/status`, token, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
    reload();
  }

  async function removeCompetition(id: string) {
    await request(`/competitions/${id}`, token, { method: "DELETE" });
    reload();
  }

  return (
    <div className="space-y-5">
      <PageTitle title="Competições" subtitle="Campeonatos, inscrição e histórico de participação" />
      {isAdmin && (
        <Card>
          <form className="grid gap-3 lg:grid-cols-6" onSubmit={saveCompetition}>
            <Input className="lg:col-span-2" placeholder="Nome da competição" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input type="date" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} required />
            <Input placeholder="Local" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} required />
            <Input type="number" step="0.01" placeholder="Inscrição" value={form.registrationFee} onChange={(e) => setForm({ ...form, registrationFee: e.target.value })} required />
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="open">Aberta</option>
              <option value="closed">Fechada</option>
              <option value="completed">Realizada</option>
            </Select>
            <Button className="lg:col-start-6">
              <Save size={16} /> {editingId ? "Salvar" : "Adicionar"}
            </Button>
          </form>
        </Card>
      )}
      {message && <Card className="border-royal-gold/40 text-royal-gold">{message}</Card>}
      {loading && <Loading title="Carregando competições" />}
      {error && <ErrorBox message={error} />}
      <div className="grid gap-4 lg:grid-cols-2">
        {data?.map((item) => (
          <Card key={item.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Badge tone={item.status === "open" ? "green" : item.status === "completed" ? "gold" : "neutral"}>{competitionStatus(item.status)}</Badge>
                <h3 className="mt-3 text-xl font-bold text-white">{item.name}</h3>
                <p className="mt-1 text-sm text-royal-muted">{formatDate(item.event_date)} · {item.location}</p>
              </div>
              <p className="font-black text-royal-gold">{formatMoney(item.registration_fee)}</p>
            </div>
            <p className="mt-4 text-sm text-zinc-300">{item.confirmed_students} alunos confirmados.</p>
            {studentId && item.status === "open" && (
              <Button className="mt-4" onClick={() => confirm(item.id)}>
                <Award size={16} /> Confirmar participação
              </Button>
            )}
            {isAdmin && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="ghost" onClick={() => editCompetition(item)}>
                  Editar
                </Button>
                {item.status !== "completed" && (
                  <Button onClick={() => updateCompetitionStatus(item.id, "completed")}>
                    Marcar como realizada
                  </Button>
                )}
                <Button variant="ghost" onClick={() => updateCompetitionStatus(item.id, item.status === "open" ? "closed" : "open")}>
                  {item.status === "open" ? "Fechar inscrições" : "Reabrir"}
                </Button>
                <Button variant="danger" onClick={() => removeCompetition(item.id)}>
                  Remover
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

function Logo({ size = "sm" }: { size?: "sm" | "lg" }) {
  return (
    <div className="flex items-center gap-3">
      <img
        src="/logo-filhos-do-rei.png"
        className={`${size === "lg" ? "h-16 w-16" : "h-12 w-12"} logo-glow rounded-full border border-royal-gold object-cover`}
        alt="Filhos do Rei BJJ"
      />
      <div>
        <p className={`${size === "lg" ? "text-xl" : "text-base"} font-black leading-tight text-white`}>FILHOS DO REI BJJ</p>
        <p className="text-xs font-semibold uppercase tracking-wider text-royal-gold">WILLIAM LAGO</p>
      </div>
    </div>
  );
}

function SparkXp() {
  return (
    <span className="xp-spark grid h-8 w-8 place-items-center rounded-full bg-royal-gold text-black">
      <CheckCircle2 size={18} />
    </span>
  );
}

function PageTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header>
      <h1 className="text-2xl font-black text-white sm:text-3xl">{title}</h1>
      <p className="mt-1 text-sm text-royal-muted">{subtitle}</p>
    </header>
  );
}

function StatCard({ icon, label, value, danger = false }: { icon: React.ReactNode; label: string; value: React.ReactNode; danger?: boolean }) {
  return (
    <Card>
      <div className={`mb-4 grid h-10 w-10 place-items-center rounded-lg ${danger ? "bg-royal-red/15 text-royal-red" : "bg-royal-gold/15 text-royal-gold"}`}>
        {icon}
      </div>
      <p className="text-sm text-royal-muted">{label}</p>
      <p className="mt-1 text-2xl font-black text-white">{value}</p>
    </Card>
  );
}

function Avatar({ src, name, size = "sm" }: { src: string; name: string; size?: "sm" | "lg" }) {
  return (
    <img
      className={`${size === "lg" ? "h-24 w-24" : "h-12 w-12"} rounded-lg border border-royal-line bg-black object-cover`}
      src={src || `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}`}
      alt=""
    />
  );
}

function BeltProgress({ belt, stripes, remaining, compact = false }: { belt: string; stripes: number; remaining: number; compact?: boolean }) {
  const safeStripes = Math.min(4, Math.max(0, Number(stripes ?? 0)));
  const classesLeft = Math.max(0, Number(remaining ?? 0));
  const ready = classesLeft === 0;
  const nextStep = safeStripes >= 4 ? "próxima faixa" : "próximo grau";
  const theme = beltTheme(belt);

  return (
    <div className={`belt-card rounded-lg border ${ready ? "border-emerald-400/35 bg-emerald-400/10" : "border-white/10 bg-black/25"} ${compact ? "p-3" : "p-4"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-wider text-royal-muted">Graduação</p>
          <p className={`${compact ? "text-sm" : "text-lg"} font-black text-white`}>
            Faixa {belt} · {safeStripes}/4 graus
          </p>
        </div>
        <Badge tone={ready ? "green" : "gold"}>{ready ? "Pronto para avaliação" : `Faltam ${classesLeft} aulas`}</Badge>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="belt-bar relative h-8 flex-1 overflow-hidden rounded-sm border border-black/50" style={{ background: theme.background }}>
          <div className="absolute inset-y-0 left-1/2 w-9 -translate-x-1/2 bg-black/20" />
          <div className="absolute right-5 top-1/2 flex -translate-y-1/2 gap-1 rounded-sm bg-black px-2 py-1">
            {[0, 1, 2, 3].map((stripe) => (
              <span key={stripe} className={`h-5 w-1 rounded-sm ${stripe < safeStripes ? "bg-royal-gold" : "bg-white/20"}`} />
            ))}
          </div>
        </div>
      </div>
      {!compact && (
        <p className="mt-3 text-sm text-zinc-300">
          O professor controla esta graduação. O aluno apenas acompanha quando faltam aulas para o {nextStep}.
        </p>
      )}
    </div>
  );
}

function beltTheme(belt: string) {
  const themes: Record<string, { background: string }> = {
    branca: { background: "linear-gradient(90deg, #e5e7eb, #ffffff 45%, #d4d4d8)" },
    cinza: { background: "linear-gradient(90deg, #52525b, #a1a1aa 45%, #3f3f46)" },
    amarela: { background: "linear-gradient(90deg, #ca8a04, #facc15 45%, #a16207)" },
    laranja: { background: "linear-gradient(90deg, #c2410c, #fb923c 45%, #9a3412)" },
    verde: { background: "linear-gradient(90deg, #166534, #22c55e 45%, #14532d)" },
    azul: { background: "linear-gradient(90deg, #1d4ed8, #60a5fa 45%, #1e3a8a)" },
    roxa: { background: "linear-gradient(90deg, #6d28d9, #a78bfa 45%, #4c1d95)" },
    marrom: { background: "linear-gradient(90deg, #78350f, #a16207 45%, #451a03)" },
    preta: { background: "linear-gradient(90deg, #020617, #18181b 45%, #000000)" }
  };

  return themes[belt.toLowerCase()] ?? themes.branca;
}

function imageFileToProfileDataUrl(file: File) {
  if (!file.type.startsWith("image/")) {
    return Promise.reject(new Error("Selecione um arquivo de imagem."));
  }

  if (file.size > 6 * 1024 * 1024) {
    return Promise.reject(new Error("Escolha uma imagem de até 6 MB."));
  }

  return new Promise<string>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      const maxSize = 512;
      const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");

      if (!context) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Não foi possível preparar a imagem."));
        return;
      }

      context.drawImage(image, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl);
          if (!blob) {
            reject(new Error("Não foi possível preparar a imagem."));
            return;
          }

          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
          reader.readAsDataURL(blob);
        },
        "image/jpeg",
        0.86
      );
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Não foi possível abrir a imagem."));
    };

    image.src = objectUrl;
  });
}

function Loading({ title }: { title: string }) {
  return <Card className="animate-pulse text-sm text-royal-muted">{title}...</Card>;
}

function ErrorBox({ message }: { message: string }) {
  return <Card className="border-royal-red/40 bg-royal-red/10 text-sm text-red-200">{message}</Card>;
}

function statusBadge(status?: string | null) {
  if (status === "paid") return <Badge tone="green">Pago</Badge>;
  if (status === "overdue") return <Badge tone="red">Atrasado</Badge>;
  if (status === "pending") return <Badge tone="gold">Pendente</Badge>;
  return <Badge>Sem mensalidade</Badge>;
}

function techniqueBadge(status: Technique["status"]) {
  const tone = status === "learned" ? "green" : status === "developing" ? "gold" : "neutral";
  return <Badge tone={tone}>{techniqueStatus(status)}</Badge>;
}

function techniqueStatus(status: string) {
  const labels: Record<string, string> = {
    learned: "Aprendida",
    developing: "Em desenvolvimento",
    not_learned: "Não aprendida"
  };
  return labels[status] ?? status;
}

function paymentStatus(status?: string | null) {
  const labels: Record<string, string> = {
    paid: "Pago",
    pending: "Pendente",
    overdue: "Atrasado"
  };
  return status ? labels[status] ?? status : "Sem dados";
}

function competitionStatus(status?: string | null) {
  const labels: Record<string, string> = {
    open: "Aberta",
    closed: "Fechada",
    completed: "Realizada"
  };
  return status ? labels[status] ?? status : "Sem status";
}

function roleLabel(role: string) {
  const labels: Record<string, string> = {
    admin: "Administrador",
    teacher: "Professor",
    student: "Aluno",
    finance: "Financeiro"
  };
  return labels[role] ?? role;
}

function groupBy<T>(items: T[], getKey: (item: T) => string) {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    const key = getKey(item);
    acc[key] = acc[key] ? [...acc[key], item] : [item];
    return acc;
  }, {});
}

function useApi<T>(path: string | null, token: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [error, setError] = useState("");
  const [reloadIndex, setReloadIndex] = useState(0);

  useEffect(() => {
    if (!path) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError("");
    request<T>(path, token)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Erro ao carregar dados.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [path, token, reloadIndex]);

  return { data, loading, error, reload: () => setReloadIndex((value) => value + 1) };
}
