import {
  ArrowRight,
  Award,
  BellRing,
  BookOpen,
  CalendarCheck,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  CreditCard,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FileText,
  Home,
  KeyRound,
  LockKeyhole,
  LogOut,
  Mail,
  Medal,
  MessageCircle,
  Moon,
  Pencil,
  Phone,
  Plus,
  Save,
  Shield,
  ShoppingBag,
  Sparkles,
  Sun,
  Trash2,
  Trophy,
  Upload,
  Search,
  UserPlus,
  UserRound,
  Users
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  type AdminDashboard,
  type AdminUser,
  type CheckinRequest,
  type Competition,
  type FinanceEntry,
  type FinanceSummary,
  type MembershipPlan,
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
import { Badge, Button, Card, CheckboxField, EmptyState, Field, Input, Select } from "./components/ui";

const sessionKey = "filhos-do-rei-session";
const beltOptions = ["Branca", "Cinza", "Amarela", "Laranja", "Verde", "Azul", "Roxa", "Marrom", "Preta"] as const;
const emptyStudentForm = {
  fullName: "",
  email: "",
  birthDate: "",
  cpf: "",
  phoneDdd: "",
  phone: "",
  address: "",
  zipCode: "",
  planId: "",
  billingDueDate: "",
  billingNotify: true,
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
  ["plans", "Planos"],
  ["attendance", "Aulas"],
  ["checkins", "Check-ins realizados"],
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
  { key: "plans", label: "Planos", icon: CreditCard },
  { key: "attendance", label: "Aulas", icon: ClipboardCheck },
  { key: "checkins", label: "Check-ins realizados", icon: CalendarCheck },
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
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => window.matchMedia?.("(display-mode: standalone)").matches ?? false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [now, setNow] = useState(() => new Date());
  const [cardTransform, setCardTransform] = useState("perspective(900px) rotateX(0deg) rotateY(0deg)");
  const activeQuote = motivationalQuotes[quoteIndex % motivationalQuotes.length];
  const greeting = getGreeting(now);
  const currentTime = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(now);
  const currentDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(now);

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

  useEffect(() => {
    const quoteTimer = window.setInterval(() => {
      setQuoteIndex((current) => (current + 1) % motivationalQuotes.length);
    }, 9000);
    const clockTimer = window.setInterval(() => setNow(new Date()), 60000);

    return () => {
      window.clearInterval(quoteTimer);
      window.clearInterval(clockTimer);
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

  function switchMode(nextMode: "login" | "register" | "reset") {
    setMode(nextMode);
    setError("");
    setMessage("");
  }

  function handleCardMove(event: React.MouseEvent<HTMLElement>) {
    if (window.matchMedia("(max-width: 760px), (pointer: coarse), (prefers-reduced-motion: reduce)").matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    setCardTransform(`perspective(900px) rotateX(${(-y).toFixed(2)}deg) rotateY(${x.toFixed(2)}deg)`);
  }

  function handleCardLeave() {
    setCardTransform("perspective(900px) rotateX(0deg) rotateY(0deg)");
  }

  return (
    <main className="login-screen premium-login-screen" data-belt-theme="black">
      <div className="login-topline">
        <div className="login-greeting">
          {greeting.icon}
          <span>{greeting.text}</span>
        </div>
        <div className="login-clock">
          <strong>{currentTime}</strong>
          <span>{currentDate}</span>
        </div>
      </div>

      <section
        className="premium-login-card"
        aria-label="Acesso Filhos do Rei BJJ"
        onMouseMove={handleCardMove}
        onMouseLeave={handleCardLeave}
        style={{ transform: cardTransform }}
      >
        <div className="login-card-shine" aria-hidden="true" />
        <header className="login-identity">
          <button className="login-logo-button" type="button" aria-label="Logo Filhos do Rei BJJ">
            <img src="/logo-filhos-do-rei.png" className="academy-logo" alt="Filhos do Rei BJJ Wilian Lago" />
          </button>
          <h1 className="login-title">FILHOS DO REI BJJ</h1>
          <p className="login-subtitle">BRAZILIAN JIU-JITSU ACADEMY</p>
          <p className="login-quote" key={activeQuote}>
            {renderMotivationalQuote(activeQuote)}
          </p>
          {installPrompt && !installed && (
            <button type="button" className="pwa-install-button" onClick={installApp}>
              <Download size={16} />
              Instalar aplicativo
            </button>
          )}
        </header>

        <div className="login-feedback-region" aria-live="polite">
          {message && <p className="login-feedback login-feedback-success">{message}</p>}
          {error && <p className="login-feedback login-feedback-error">{error}</p>}
        </div>

        {mode === "login" && (
          <form className="login-form" onSubmit={submit}>
            <PremiumInput
              label="Usuário ou e-mail"
              icon={<UserRound size={19} />}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Digite seu usuário ou e-mail"
              autoComplete="username"
              name="username"
              required
            />
            <PremiumInput
              label="Senha"
              icon={<LockKeyhole size={19} />}
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Digite sua senha"
              autoComplete="current-password"
              name="password"
              required
              trailing={
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
            />
            <div className="login-options">
              <label className="remember-option">
                <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />
                <span>Lembrar-me</span>
              </label>
              <button type="button" className="login-text-link" onClick={() => switchMode("reset")}>
                Esqueceu sua senha?
              </button>
            </div>
            <button className="login-submit-button" disabled={loading} aria-busy={loading}>
              <span>{loading ? "Entrando..." : "Entrar"}</span>
              {loading ? <span className="login-spinner" aria-hidden="true" /> : <ArrowRight size={18} />}
            </button>
          </form>
        )}

        {mode === "register" && (
          <form className="login-form" onSubmit={submitRegister}>
            <PremiumInput label="Nome completo" icon={<UserRound size={19} />} placeholder="Nome completo" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
            <PremiumInput label="E-mail" icon={<Mail size={19} />} type="email" placeholder="E-mail" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
            <PremiumInput label="Telefone" icon={<Phone size={19} />} placeholder="Telefone com DDD" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" required />
            <PremiumInput
              label="Senha"
              icon={<LockKeyhole size={19} />}
              type="password"
              placeholder="Senha: 6 a 8 caracteres com especial"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              required
            />
            <button className="login-submit-button" disabled={loading} aria-busy={loading}>
              <span>{loading ? "Enviando..." : "Enviar cadastro"}</span>
              {loading ? <span className="login-spinner" aria-hidden="true" /> : <ArrowRight size={18} />}
            </button>
          </form>
        )}

        {mode === "reset" && (
          <form className="login-form" onSubmit={submitReset}>
            <PremiumInput label="E-mail cadastrado" icon={<Mail size={19} />} type="email" placeholder="E-mail cadastrado" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
            <PremiumInput label="Telefone" icon={<Phone size={19} />} placeholder="Telefone com DDD" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" />
            <button className="login-submit-button" disabled={loading} aria-busy={loading}>
              <span>{loading ? "Enviando..." : "Solicitar nova senha"}</span>
              {loading ? <span className="login-spinner" aria-hidden="true" /> : <KeyRound size={18} />}
            </button>
          </form>
        )}

        <div className="login-divider" aria-hidden="true">
          <span>OU</span>
        </div>
        <div className="login-actions">
          {mode !== "login" && (
            <button type="button" onClick={() => switchMode("login")}>
              <ArrowRight size={15} /> Voltar ao login
            </button>
          )}
          {mode !== "register" && (
            <button type="button" onClick={() => switchMode("register")}>
              <UserPlus size={15} /> Cadastrar aluno
            </button>
          )}
          {mode !== "reset" && mode !== "login" && (
            <button type="button" onClick={() => switchMode("reset")}>
              <KeyRound size={15} /> Recuperar senha
            </button>
          )}
        </div>
      </section>

      <footer className="login-footer">
        <span>Versão 0.1.0</span>
        <p>
          Forje <strong>campeões</strong>. Forme <strong>caráter</strong>.
        </p>
      </footer>
    </main>
  );
}

const motivationalQuotes = [
  "A disciplina vence o talento.",
  "Forje campeões. Forme caráter.",
  "A evolução começa quando a desculpa termina.",
  "Respeito, disciplina e constância.",
  "Todo faixa-preta já foi um faixa-branca."
];

function getGreeting(date: Date) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return { text: "Bom dia, guerreiro.", icon: <Sun size={16} /> };
  if (hour >= 12 && hour < 18) return { text: "Boa tarde, guerreiro.", icon: <Sparkles size={16} /> };
  return { text: "Boa noite, guerreiro.", icon: <Moon size={16} /> };
}

function renderMotivationalQuote(text: string) {
  const highlight = ["disciplina", "campeões", "caráter", "evolução", "Respeito", "faixa-preta"].find((word) => text.includes(word));
  if (!highlight) return text;
  const [before, after] = text.split(highlight);
  return (
    <>
      {before}
      <span>{highlight}</span>
      {after}
    </>
  );
}

function PremiumInput({
  label,
  icon,
  trailing,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <label className="premium-field">
      <span className="premium-field-label">{label}</span>
      <span className="premium-input-wrapper">
        <span className="premium-input-icon" aria-hidden="true">
          {icon}
        </span>
        <Input className={`premium-input ${trailing ? "premium-input-with-action" : ""} ${className}`} {...props} />
        {trailing}
      </span>
    </label>
  );
}

function AdminApp({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const [tab, setTab] = useState<AdminTab>("dashboard");
  const allowed = session.user.permissions ?? [];
  const visibleNav = adminNav.filter(
    (item) => session.user.role === "admin" || allowed.includes(item.key) || (item.key === "checkins" && allowed.includes("attendance"))
  );

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
      {tab === "plans" && <PlansPanel token={session.token} />}
      {tab === "attendance" && <AttendancePanel token={session.token} />}
      {tab === "checkins" && <CheckinsPanel token={session.token} />}
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
      {tab === "ranking" && <RankingPanel token={session.token} currentStudentId={session.student?.id} />}
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
  const [errorMessage, setErrorMessage] = useState("");
  const [reviewingRegistrationId, setReviewingRegistrationId] = useState<string | null>(null);
  const [reviewingResetId, setReviewingResetId] = useState<string | null>(null);

  async function reviewRegistration(id: string, status: "approved" | "rejected") {
    setMessage("");
    setErrorMessage("");
    setReviewingRegistrationId(id);
    try {
      await request(`/admin/registration-requests/${id}`, token, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      setMessage(status === "approved" ? "Cadastro aprovado." : "Cadastro recusado.");
      registrations.reload();
      users.reload();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Não foi possível revisar o cadastro.");
    } finally {
      setReviewingRegistrationId(null);
    }
  }

  async function reviewReset(id: string, status: "resolved" | "rejected") {
    setMessage("");
    setErrorMessage("");
    const newPassword = resetPasswords[id] ?? "";
    if (status === "resolved" && !/^(?=.*[^A-Za-z0-9]).{6,8}$/.test(newPassword)) {
      setErrorMessage("A nova senha precisa ter de 6 a 8 caracteres e pelo menos um caractere especial.");
      return;
    }

    setReviewingResetId(id);
    try {
      await request(`/admin/password-reset-requests/${id}`, token, {
        method: "PATCH",
        body: JSON.stringify({ status, newPassword })
      });
      setMessage(status === "resolved" ? "Senha redefinida. O aluno já pode acessar com a nova senha." : "Solicitação recusada.");
      setResetPasswords(({ [id]: _removed, ...rest }) => rest);
      resets.reload();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Não foi possível revisar a recuperação de senha.");
    } finally {
      setReviewingResetId(null);
    }
  }

  return (
    <div className="space-y-5">
      <PageTitle title="Usuários e permissões" subtitle="Aprovação de cadastro, recuperação de senha e controle de acesso" />
      {message && <Card className="border-royal-gold/40 text-sm text-royal-gold">{message}</Card>}
      {errorMessage && <ErrorBox message={errorMessage} />}

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
                  <Button disabled={reviewingRegistrationId === item.id} onClick={() => reviewRegistration(item.id, "approved")}>Aprovar</Button>
                  <Button disabled={reviewingRegistrationId === item.id} variant="danger" onClick={() => reviewRegistration(item.id, "rejected")}>Recusar</Button>
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
                  minLength={6}
                  maxLength={8}
                  value={resetPasswords[item.id] ?? ""}
                  onChange={(event) => setResetPasswords({ ...resetPasswords, [item.id]: event.target.value })}
                />
                <Button disabled={reviewingResetId === item.id} onClick={() => reviewReset(item.id, "resolved")}>Redefinir</Button>
                <Button disabled={reviewingResetId === item.id} variant="danger" onClick={() => reviewReset(item.id, "rejected")}>Recusar</Button>
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
  const [deleting, setDeleting] = useState(false);

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

  async function deleteStudentUser() {
    const confirmed = window.confirm(`Excluir o usuário ${user.name} e remover o aluno vinculado? Essa ação não pode ser desfeita.`);
    if (!confirmed) return;

    setDeleting(true);
    try {
      await request(`/admin/users/${user.id}`, token, { method: "DELETE" });
      onSaved();
    } finally {
      setDeleting(false);
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
        <div className="flex flex-wrap justify-end gap-2">
          {user.role === "student" && (
            <Button variant="danger" disabled={deleting} onClick={deleteStudentUser}>
              <Trash2 size={16} /> {deleting ? "Excluindo..." : "Excluir aluno"}
            </Button>
          )}
          <Button disabled={saving} onClick={save}>
            <Save size={16} /> {saving ? "Salvando..." : "Salvar permissões"}
          </Button>
        </div>
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

function PlansPanel({ token }: { token: string }) {
  const { data, loading, error, reload } = useApi<MembershipPlan[]>("/plans", token);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    audience: "",
    monthlyValue: 120,
    dueDay: 10,
    description: "",
    status: "active"
  });

  async function savePlan(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await request(editingPlanId ? `/plans/${editingPlanId}` : "/plans", token, {
        method: editingPlanId ? "PUT" : "POST",
        body: JSON.stringify(form)
      });
      setEditingPlanId(null);
      setForm({ name: "", audience: "", monthlyValue: 120, dueDay: 10, description: "", status: "active" });
      reload();
    } finally {
      setSaving(false);
    }
  }

  function editPlan(plan: MembershipPlan) {
    setEditingPlanId(plan.id);
    setForm({
      name: plan.name,
      audience: plan.audience,
      monthlyValue: Number(plan.monthly_value),
      dueDay: Number(plan.due_day),
      description: plan.description ?? "",
      status: plan.status
    });
  }

  return (
    <div className="space-y-5">
      <PageTitle title="Gerência de planos" subtitle="Tipos de mensalidade, valores e vencimento padrão dos alunos" />
      <Card>
        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-6" onSubmit={savePlan}>
          <Input className="xl:col-span-2" placeholder="Nome do plano" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input placeholder="Público" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} required />
          <Input min={0} step="0.01" type="number" placeholder="Valor mensal" value={form.monthlyValue} onChange={(e) => setForm({ ...form, monthlyValue: Number(e.target.value) })} required />
          <Input min={1} max={28} type="number" placeholder="Dia venc." value={form.dueDay} onChange={(e) => setForm({ ...form, dueDay: Number(e.target.value) })} required />
          <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
          </Select>
          <Input className="md:col-span-2 xl:col-span-5" placeholder="Observações do plano" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Button disabled={saving}>
            {editingPlanId ? <Save size={16} /> : <Plus size={16} />}
            {editingPlanId ? "Salvar plano" : "Adicionar plano"}
          </Button>
          {editingPlanId && (
            <Button
              type="button"
              variant="ghost"
              className="xl:col-start-6"
              onClick={() => {
                setEditingPlanId(null);
                setForm({ name: "", audience: "", monthlyValue: 120, dueDay: 10, description: "", status: "active" });
              }}
            >
              Cancelar
            </Button>
          )}
        </form>
      </Card>
      {loading && <Loading title="Carregando planos" />}
      {error && <ErrorBox message={error} />}
      {data && (
        <div className="grid gap-3 md:grid-cols-2">
          {data.map((plan) => (
            <Card key={plan.id} className="grid gap-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-white">{plan.name}</h3>
                    <Badge tone={plan.status === "active" ? "green" : "neutral"}>{plan.status === "active" ? "Ativo" : "Inativo"}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-royal-muted">{plan.audience}</p>
                </div>
                <p className="text-right text-xl font-black text-royal-gold">{formatMoney(plan.monthly_value)}</p>
              </div>
              <div className="grid gap-2 text-sm text-zinc-300 sm:grid-cols-2">
                <span>Mensalidade recorrente</span>
                <span>Vencimento padrão: dia {plan.due_day}</span>
                <span>Check-in: {plan.checkin_start_time} às {plan.checkin_end_time}</span>
                <span>Dias: {formatWeekDays(plan.checkin_days)}</span>
              </div>
              {plan.description && <p className="text-sm text-royal-muted">{plan.description}</p>}
              <div className="flex justify-end">
                <Button variant="ghost" onClick={() => editPlan(plan)}>
                  <Pencil size={16} /> Editar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function StudentsPanel({ token }: { token: string }) {
  const { data, loading, error, reload } = useApi<Student[]>("/students", token);
  const plans = useApi<MembershipPlan[]>("/plans", token);
  const [form, setForm] = useState(emptyStudentForm);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const activePlans = (plans.data ?? []).filter((plan) => plan.status === "active");
  const filteredStudents = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!data || !term) return data ?? [];
    return data.filter((student) =>
      [student.full_name, student.email, student.phone, student.cpf, student.plan_name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [data, search]);

  async function saveStudent(event: React.FormEvent) {
    event.preventDefault();
    if (!editingStudentId) return;
    setSaving(true);
    try {
      await request<Student>(`/students/${editingStudentId}`, token, {
        method: "PUT",
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
      birthDate: student.birth_date ? student.birth_date.slice(0, 10) : "",
      cpf: student.cpf ?? "",
      phoneDdd: student.phone_ddd ?? "",
      phone: student.phone ?? "",
      address: student.address ?? "",
      zipCode: student.zip_code ?? "",
      planId: student.plan_id ?? "",
      billingDueDate: student.billing_due_date ? student.billing_due_date.slice(0, 10) : "",
      billingNotify: Boolean(student.billing_notify),
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

  return (
    <div className="space-y-5">
      <PageTitle title="Gestão de alunos" subtitle="Atualização cadastral, graduação, frequência e status financeiro" />
      {editingStudentId ? (
      <Card>
        <form className="space-y-5" onSubmit={saveStudent}>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-3 lg:col-span-2">
              <p className="text-sm font-bold text-white">Dados pessoais</p>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Nome completo" hint="Ex.: João Pedro Silva" className="md:col-span-2">
                  <Input placeholder="Digite o nome completo do aluno" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
                </Field>
                <Field label="Nascimento" hint="Data de nascimento do aluno">
                  <Input type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
                </Field>
                <Field label="CPF" hint="Documento do aluno">
                  <Input placeholder="000.000.000-00" value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} />
                </Field>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-bold text-white">Contato</p>
              <Field label="E-mail" hint="Usado para acesso e avisos">
                <Input placeholder="aluno@email.com" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </Field>
              <div className="grid grid-cols-[92px_1fr] gap-2">
                <Field label="DDD">
                  <Input placeholder="11" value={form.phoneDdd} onChange={(e) => setForm({ ...form, phoneDdd: e.target.value })} />
                </Field>
                <Field label="Telefone">
                  <Input placeholder="99999-9999" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </Field>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-[1.5fr_.6fr]">
            <Field label="Endereço" hint="Rua, número, bairro e cidade">
              <Input placeholder="Rua Exemplo, 123 - Centro" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </Field>
            <Field label="CEP">
              <Input placeholder="00000-000" value={form.zipCode} onChange={(e) => setForm({ ...form, zipCode: e.target.value })} />
            </Field>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr]">
            <Field label="Plano" hint="Define o valor da mensalidade">
              <Select value={form.planId} onChange={(e) => setForm({ ...form, planId: e.target.value })} required>
                <option value="">Selecione um plano</option>
                {activePlans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} - {formatMoney(plan.monthly_value)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Vencimento" hint="Data da primeira mensalidade">
              <Input type="date" value={form.billingDueDate} onChange={(e) => setForm({ ...form, billingDueDate: e.target.value })} />
            </Field>
            <CheckboxField
              checked={form.billingNotify}
              onChange={(e) => setForm({ ...form, billingNotify: e.target.checked })}
              label="Notificar vencimento"
              hint="WhatsApp e e-mail quando configurados"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Faixa">
              <Select value={form.belt} onChange={(e) => setForm({ ...form, belt: e.target.value })}>
                {beltOptions.map((belt) => (
                  <option key={belt}>{belt}</option>
                ))}
              </Select>
            </Field>
            <Field label="Graus">
              <Select value={form.stripeCount} onChange={(e) => setForm({ ...form, stripeCount: Number(e.target.value) })}>
                {[0, 1, 2, 3, 4].map((stripe) => (
                  <option key={stripe} value={stripe}>
                    {stripe} grau{stripe === 1 ? "" : "s"}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Aulas para próximo grau" hint="Contador definido pelo professor">
              <Input min={0} type="number" placeholder="12" value={form.classesUntilNextStripe} onChange={(e) => setForm({ ...form, classesUntilNextStripe: Number(e.target.value) })} />
            </Field>
          </div>

          <Field label="Objetivos e observações" hint="Metas, restrições, observações médicas ou orientação do professor">
            <Input placeholder="Ex.: melhorar defesa de guarda e treinar 3x por semana" value={form.goals} onChange={(e) => setForm({ ...form, goals: e.target.value })} />
          </Field>

          <div className="flex flex-wrap gap-2">
            <Button disabled={saving}>
              <Save size={16} /> {saving ? "Salvando..." : "Salvar alterações"}
            </Button>
            <Button type="button" variant="ghost" onClick={cancelEdit}>
              Cancelar
            </Button>
          </div>
        </form>
      </Card>
      ) : (
        <Card className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-black text-white">Selecione um aluno para editar</h3>
            <p className="mt-1 text-sm text-royal-muted">
              Novos cadastros devem ser feitos pelo aluno na tela inicial. O professor aprova o cadastro e, depois, usa esta aba apenas para corrigir dados, plano, faixa, graus e aulas para a próxima graduação.
            </p>
          </div>
          <Badge tone="gold">Edição somente após aprovação</Badge>
        </Card>
      )}
      <Card>
        <Input
          placeholder="Pesquisar aluno por nome, e-mail, telefone, CPF ou plano"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </Card>
      {loading && <Loading title="Carregando alunos" />}
      {error && <ErrorBox message={error} />}
      {data && (
        <div className="grid gap-3">
          {filteredStudents.map((student) => (
            <Card key={student.id} className="grid gap-4 md:grid-cols-[auto_1fr_auto_auto] md:items-center">
              <Avatar src={student.photo_url} name={student.full_name} />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-white">{student.full_name}</h3>
                  <Badge tone="gold">{student.belt}</Badge>
                  <Badge>{student.stripe_count} grau{Number(student.stripe_count) === 1 ? "" : "s"}</Badge>
                  {student.plan_name && <Badge tone="green">{student.plan_name}</Badge>}
                  {statusBadge(student.payment_status)}
                </div>
                <p className="mt-1 text-sm text-royal-muted">
                  {student.phone || "Sem telefone"} · {Number(student.monthly_attendance ?? 0)} treinos no mês · Nível {student.level}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {student.phone_ddd ? `DDD ${student.phone_ddd} · ` : ""}{student.cpf ? `CPF ${student.cpf} · ` : ""}
                  {student.plan_value ? `${formatMoney(student.plan_value)} mensal` : "Sem plano"} · Vencimento {student.billing_due_date ? formatDate(student.billing_due_date) : student.due_date ? formatDate(student.due_date) : "não definido"} · {student.billing_notify ? "Notifica vencimento" : "Sem notificação"}
                </p>
              </div>
              <BeltProgress belt={student.belt} stripes={student.stripe_count} remaining={student.classes_until_next_stripe} compact />
              <div className="flex flex-wrap gap-2 md:justify-end">
                <Button variant="ghost" onClick={() => editStudent(student)}>
                  <Pencil size={16} /> Editar
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
  const [checkinBurst, setCheckinBurst] = useState(false);
  const [lastCheckinXp, setLastCheckinXp] = useState<number | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoMessage, setPhotoMessage] = useState("");

  useEffect(() => {
    if (data?.checkin?.status !== "pending") return;
    const interval = window.setInterval(reload, 5000);
    return () => window.clearInterval(interval);
  }, [data?.checkin?.status, reload]);

  useEffect(() => {
    if (!checkinBurst) return;
    const timeout = window.setTimeout(() => setCheckinBurst(false), 1800);
    return () => window.clearTimeout(timeout);
  }, [checkinBurst]);

  useEffect(() => {
    if ("Notification" in window) setNotificationPermission(Notification.permission);
  }, []);

  useEffect(() => {
    if (notificationPermission !== "granted" || !data?.nextClass) return;

    const classTime = new Date(data.nextClass.class_date).getTime();
    if (Number.isNaN(classTime)) return;

    const reminderAt = classTime - 30 * 60 * 1000;
    const now = Date.now();
    const reminderKey = `filhos-do-rei-lesson-reminder:${data.nextClass.id}:${new Date(data.nextClass.class_date).toISOString().slice(0, 10)}`;
    if (localStorage.getItem(reminderKey)) return;
    if (now > classTime + 30 * 60 * 1000) return;

    const delay = Math.max(0, reminderAt - now);
    const timeout = window.setTimeout(() => {
      showLessonNotification(data.nextClass?.title ?? "Aula de Jiu-Jitsu", data.nextClass?.class_date);
      localStorage.setItem(reminderKey, "sent");
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [data?.nextClass, notificationPermission]);

  if (loading) return <Loading title="Carregando área do aluno" />;
  if (error) return <ErrorBox message={error} />;
  if (!data) return null;

  const activeCheckin = data.checkin;
  const studentName = data.student.full_name || "Aluno";
  const firstName = studentName.split(" ")[0] || "aluno";
  const safeStripes = normalizeStripeCount(data.student.stripe_count);
  const classesLeft = safeNumber(data.student.classes_until_next_stripe);
  const graduationLabel = formatGraduationLabel(data.student.belt, safeStripes);
  const beltThemeKey = normalizeBeltTheme(data.student.belt);
  const techniqueTotal = data.techniqueSummary.reduce((sum, item) => sum + item.total, 0);
  const studentGoal = data.student.goals?.trim();
  const checkinOpen = Boolean(data.nextClass?.checkin_open);
  const remindersSupported = "Notification" in window;
  const checkinRecentlyConfirmed = lastCheckinXp !== null;
  const checkinApproved = activeCheckin?.status === "approved" || checkinRecentlyConfirmed;
  const confirmedXp = Math.max(Number(lastCheckinXp ?? 0), Number(activeCheckin?.xp_awarded ?? 0));
  const checkinCardClass = [
    "training-checkin-card",
    checkinOpen ? "is-open" : "is-closed",
    checkinApproved ? "is-approved" : "",
    checkinLoading ? "is-loading" : "",
    checkinBurst ? "is-burst" : ""
  ]
    .filter(Boolean)
    .join(" ");
  const checkinActionText = checkinLoading
    ? "Registrando treino..."
    : checkinApproved
      ? "Treino confirmado"
      : checkinOpen
        ? "Confirmar presença"
        : data.nextClass
          ? "Disponível no dia da aula"
          : "Sem aula disponível";

  async function requestCheckin() {
    if (!data?.nextClass) return;
    if (!checkinOpen) {
      setCheckinMessage("Check-in disponível no dia de aula.");
      return;
    }

    setCheckinLoading(true);
    setCheckinMessage("");
    try {
      const result = await request<{ xp_awarded?: number }>("/student/checkins", token, {
        method: "POST",
        body: JSON.stringify({})
      });
      const xpAwarded = Number(result.xp_awarded ?? 0);
      setLastCheckinXp(xpAwarded);
      setCheckinBurst(true);
      setCheckinMessage(xpAwarded > 0 ? `Presença confirmada. +${xpAwarded} XP aplicado.` : "Presença já estava confirmada para esta aula.");
      reload();
    } catch (err) {
      setCheckinMessage(err instanceof Error ? err.message : "Não foi possível enviar o check-in.");
    } finally {
      setCheckinLoading(false);
    }
  }

  async function enableLessonNotifications() {
    if (!remindersSupported) {
      setCheckinMessage("Este navegador não oferece notificações para PWA.");
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);

    if (permission === "granted") {
      setCheckinMessage("Lembretes ativados. Você será avisado antes da aula quando o PWA estiver ativo.");
      await showLessonNotification("Lembretes ativados", "O Filhos do Rei BJJ vai lembrar você da próxima aula.");
      return;
    }

    setCheckinMessage("Permissão de notificação não liberada no navegador.");
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
    <div className="student-evolution space-y-5" data-belt-theme={beltThemeKey}>
      <PageTitle title={`Olá, ${firstName}`} subtitle="Sua evolução no tatame" />
      <Card className="student-profile-card grid gap-5 lg:grid-cols-[auto_1fr_auto] lg:items-center">
        <div className="profile-photo-shell">
          <Avatar src={data.student.photo_url} name={studentName} size="lg" />
          <label className="photo-action" aria-label="Adicionar ou trocar foto do perfil">
            <Camera size={14} />
            {photoLoading ? "Enviando..." : "Trocar foto"}
            <input className="hidden" type="file" accept="image/*" disabled={photoLoading} onChange={updateProfilePhoto} />
          </label>
          {photoMessage && <p className="photo-feedback" aria-live="polite">{photoMessage}</p>}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-black text-white md:text-3xl">{studentName}</h2>
            <span className="graduation-badge">{graduationLabel}</span>
            <Badge tone="green">Cadastro aprovado</Badge>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
            {studentGoal || "Cada treino é uma oportunidade de evolução. Combine seus próximos objetivos com o professor."}
          </p>
          <p className="mt-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-royal-gold">
            <Shield size={14} /> Graduação acompanhada pelo aluno e definida pelo professor
          </p>
        </div>
        <div className="student-level-card" aria-label={`Nível ${data.student.level}, ${data.student.xp} XP`}>
          <p>Nível</p>
          <strong>{data.student.level}</strong>
          <span>{data.student.xp} XP</span>
          <div className="student-level-line" />
        </div>
      </Card>
      <BeltProgress
        belt={data.student.belt}
        stripes={safeStripes}
        remaining={classesLeft}
      />
      <Card className={checkinCardClass}>
        <div className="grid gap-5 lg:grid-cols-[1fr_300px] lg:items-center">
          <div className="relative z-[1]">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold text-white">Check-in de treino</h3>
              {activeCheckin?.status === "pending" && <Badge tone="gold">Registrando</Badge>}
              {activeCheckin?.status === "approved" && <Badge tone="green">Treino validado</Badge>}
              {activeCheckin?.status === "rejected" && <Badge tone="red">Revisar com professor</Badge>}
              {checkinOpen && !checkinApproved && <span className="checkin-live-chip"><span /> Livre hoje</span>}
            </div>
            <p className="mt-2 text-sm text-zinc-300">
              {data.nextClass
                ? `${data.nextClass.title} · ${formatDate(data.nextClass.class_date)}`
                : "Nenhuma aula disponível para check-in."}
            </p>
            {data.nextClass && (
              <p className={`mt-2 text-sm ${checkinOpen ? "text-emerald-300" : "text-royal-muted"}`}>
                {checkinOpen ? "Check-in livre durante o dia de aula. Faça quando chegar no treino." : "Check-in disponível no dia da aula."}
              </p>
            )}
            {checkinApproved && confirmedXp > 0 && (
              <div className="checkin-xp-toast">
                <SparkXp /> <span>+{confirmedXp} XP confirmado</span>
              </div>
            )}
            {activeCheckin?.status === "pending" && (
              <p className="mt-3 text-sm text-royal-muted">Seu check-in está sendo processado automaticamente.</p>
            )}
            {checkinMessage && <p className="mt-3 text-sm text-royal-gold">{checkinMessage}</p>}
          </div>
          <div className="relative z-[1] flex flex-col gap-3">
            <button
              type="button"
              className="checkin-hero-button"
              aria-label={checkinActionText}
              aria-busy={checkinLoading}
              disabled={!data.nextClass || !checkinOpen || checkinLoading || checkinApproved}
              onClick={requestCheckin}
            >
              <span className="checkin-hero-icon">
                {checkinApproved ? <CheckCircle2 size={28} /> : checkinLoading ? <Sparkles size={28} /> : <CalendarCheck size={28} />}
              </span>
              <span>
                <strong>{checkinActionText}</strong>
                <small>{checkinOpen && !checkinApproved ? "+50 XP ao confirmar" : checkinApproved ? "Presença registrada" : "Disponível no dia da aula"}</small>
              </span>
              {checkinOpen && !checkinApproved && <ArrowRight className="checkin-arrow" size={20} />}
            </button>
            <div className="checkin-mini-panel">
              <Clock size={15} />
              <span>{data.nextClass ? (checkinOpen ? "Check-in livre hoje" : "Aguardando dia de aula") : "Sem aula ativa"}</span>
            </div>
            {remindersSupported && notificationPermission !== "granted" && (
              <button type="button" className="checkin-reminder-button" onClick={enableLessonNotifications}>
                <BellRing size={16} /> Ativar lembretes no celular
              </button>
            )}
            {remindersSupported && notificationPermission === "granted" && (
              <div className="checkin-reminder-status">
                <BellRing size={15} /> Lembretes ativos no PWA
              </div>
            )}
            {remindersSupported && notificationPermission === "denied" && (
              <div className="checkin-reminder-status is-blocked">
                Notificações bloqueadas no navegador
              </div>
            )}
          </div>
        </div>
      </Card>
      <div className="grid gap-4 xl:grid-cols-[1.25fr_.75fr]">
        <Card>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="section-kicker">Desenvolvimento</p>
              <h3 className="text-lg font-black text-white">Base de evolução</h3>
            </div>
            <Sparkles className="text-royal-gold" size={20} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <DevelopmentSignal icon={<CalendarCheck size={18} />} title="Disciplina" text="Em desenvolvimento" />
            <DevelopmentSignal icon={<BookOpen size={18} />} title="Técnica" text="Construindo base" />
            <DevelopmentSignal icon={<Trophy size={18} />} title="Resistência" text="Evoluindo sempre" />
            <DevelopmentSignal icon={<Shield size={18} />} title="Mentalidade" text="Forjando caráter" />
          </div>
        </Card>
        <Card>
          <p className="section-kicker">Próximos objetivos</p>
          <h3 className="mt-1 text-lg font-black text-white">Definidos pelo professor</h3>
          {studentGoal ? (
            <div className="mt-4 rounded-lg border border-royal-gold/25 bg-royal-gold/10 p-4 text-sm leading-6 text-zinc-200">
              {studentGoal}
            </div>
          ) : (
            <EmptyState>O professor ainda não definiu objetivos para esta etapa.</EmptyState>
          )}
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="text-lg font-bold text-white">Próxima aula</h3>
          {data.nextClass ? (
            <div className="mt-4 rounded-lg border border-royal-line bg-black/25 p-4">
              <p className="font-bold text-white">{data.nextClass.title}</p>
              <p className="mt-1 text-sm text-royal-muted">{formatDate(data.nextClass.class_date)}</p>
              <p className="mt-3 text-sm text-zinc-300">{data.nextClass.focus}</p>
            </div>
          ) : (
            <EmptyState>Nenhuma aula futura cadastrada.</EmptyState>
          )}
        </Card>
        <Card>
          <p className="section-kicker">Conquistas</p>
          <h3 className="mt-1 text-lg font-black text-white">Histórico do atleta</h3>
          <div className="achievement-empty mt-4">
            <Award size={20} />
            <span>Suas conquistas aparecerão aqui quando houver eventos reais registrados.</span>
          </div>
        </Card>
      </div>
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="section-kicker">Estatísticas</p>
            <h3 className="text-lg font-black text-white">Resumo rápido</h3>
          </div>
          <span className="text-xs text-royal-muted">Dados reais do sistema</span>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <EvolutionStat icon={<CalendarCheck size={18} />} label="Treinos no mês" value={data.monthlyAttendance || 0} />
          <EvolutionStat icon={<Trophy size={18} />} label="Posição geral" value={data.rankingPosition ? `#${data.rankingPosition}` : "Sem ranking"} />
          <EvolutionStat icon={<CreditCard size={18} />} label="Mensalidade" value={paymentStatus(data.payment?.status)} danger={data.payment?.status === "overdue"} />
          <EvolutionStat icon={<BookOpen size={18} />} label="Técnicas" value={techniqueTotal} />
        </div>
      </Card>
    </div>
  );
}

async function showLessonNotification(title: string, detail?: string) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const detailAsDate = detail ? new Date(detail) : null;
  const isDateDetail = detailAsDate && !Number.isNaN(detailAsDate.getTime());
  const body = isDateDetail
    ? "Sua aula está chegando. Abra o app e faça o check-in quando chegar no treino."
    : detail ?? "Lembrete da academia Filhos do Rei BJJ.";
  const options: NotificationOptions = {
    body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: "filhos-do-rei-aula",
    data: { url: "/" }
  };

  const registration = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration().catch(() => null) : null;
  if (registration?.showNotification) {
    await registration.showNotification(title, options);
    return;
  }

  new Notification(title, options);
}

function FinancePanel({ token, isAdmin = false }: { token: string; isAdmin?: boolean }) {
  if (isAdmin) return <BusinessFinancePanel token={token} />;

  const { data, loading, error, reload } = useApi<Payment[]>("/student/finance", token);
  const [advanceMonths, setAdvanceMonths] = useState("1");
  const [advanceLoading, setAdvanceLoading] = useState(false);
  const [financeMessage, setFinanceMessage] = useState("");

  const payments = data ?? [];
  const openPayments = payments
    .filter((payment) => payment.status !== "paid")
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  const paidPayments = payments
    .filter((payment) => payment.status === "paid")
    .sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime());
  const sortedPayments = [...openPayments, ...paidPayments];
  const featuredPayment = openPayments[0] ?? sortedPayments[0] ?? null;
  const openTotal = openPayments.reduce((sum, payment) => sum + Number(payment.value ?? 0), 0);
  const paidTotal = paidPayments.reduce((sum, payment) => sum + Number(payment.value ?? 0), 0);
  const paidPercent = payments.length ? Math.round((paidPayments.length / payments.length) * 100) : 0;

  async function copyPix(payment: Payment) {
    await navigator.clipboard?.writeText(payment.pix_code);
    setFinanceMessage(`PIX de ${payment.reference_month} copiado.`);
  }

  async function createAdvancePayments() {
    setAdvanceLoading(true);
    setFinanceMessage("");
    try {
      const result = await request<{ createdCount: number }>("/student/finance/advance", token, {
        method: "POST",
        body: JSON.stringify({ months: Number(advanceMonths) })
      });
      setFinanceMessage(
        result.createdCount > 0
          ? `${result.createdCount} mensalidade(s) adiantada(s) gerada(s).`
          : "As mensalidades futuras desse período já estavam geradas."
      );
      reload();
    } catch (err) {
      setFinanceMessage(err instanceof Error ? err.message : "Não foi possível gerar mensalidade adiantada.");
    } finally {
      setAdvanceLoading(false);
    }
  }

  function paymentCardClass(status: Payment["status"]) {
    if (status === "paid") return "border-emerald-400/30 bg-emerald-400/5";
    if (status === "overdue") return "border-royal-red/40 bg-royal-red/10";
    return "border-royal-gold/35 bg-royal-gold/10";
  }

  async function updatePayment(id: string, status: Payment["status"]) {
    await request(`/payments/${id}/status`, token, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
    reload();
  }

  return (
    <div className="space-y-5">
      <PageTitle title="Financeiro" subtitle="Mensalidades, PIX, histórico e pagamentos adiantados" />
      {loading && <Loading title="Carregando financeiro" />}
      {error && <ErrorBox message={error} />}
      {!loading && !error && (
        <>
          <div className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
            <Card className="overflow-hidden">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="section-kicker">Mensalidade em destaque</p>
                  <h3 className="mt-1 text-2xl font-black text-white">
                    {featuredPayment ? featuredPayment.reference_month : "Sem mensalidade gerada"}
                  </h3>
                  <p className="mt-2 text-sm text-royal-muted">
                    {featuredPayment
                      ? `Vencimento ${formatDate(featuredPayment.due_date)}`
                      : "Quando uma mensalidade for gerada, o PIX e o vencimento aparecem aqui."}
                  </p>
                </div>
                {featuredPayment && statusBadge(featuredPayment.status)}
              </div>
              {featuredPayment ? (
                <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                  <div>
                    <span className="text-sm text-royal-muted">Valor</span>
                    <p className="mt-1 text-3xl font-black text-royal-gold">{formatMoney(featuredPayment.value)}</p>
                    <code className="mt-4 block rounded-lg border border-royal-line bg-black/35 p-3 text-xs text-zinc-300">{featuredPayment.pix_code}</code>
                  </div>
                  <Button onClick={() => copyPix(featuredPayment)}>
                    <CreditCard size={16} /> Copiar PIX
                  </Button>
                </div>
              ) : (
                <EmptyState>Nenhuma mensalidade encontrada.</EmptyState>
              )}
            </Card>

            <Card>
              <p className="section-kicker">Pagamento adiantado</p>
              <h3 className="mt-1 text-lg font-black text-white">Gerar próximas mensalidades</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-300">
                Gere mensalidades futuras para copiar o PIX e antecipar o pagamento quando quiser.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
                <Select value={advanceMonths} onChange={(event) => setAdvanceMonths(event.target.value)}>
                  <option value="1">1 mensalidade</option>
                  <option value="2">2 mensalidades</option>
                  <option value="3">3 mensalidades</option>
                  <option value="6">6 mensalidades</option>
                </Select>
                <Button disabled={advanceLoading} onClick={createAdvancePayments}>
                  <Plus size={16} /> {advanceLoading ? "Gerando..." : "Gerar"}
                </Button>
              </div>
              {financeMessage && <p className="mt-3 text-sm font-semibold text-royal-gold">{financeMessage}</p>}
            </Card>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Card>
              <span className="text-sm text-royal-muted">Em aberto</span>
              <p className="mt-2 text-2xl font-black text-white">{formatMoney(openTotal)}</p>
            </Card>
            <Card>
              <span className="text-sm text-royal-muted">Pago no histórico</span>
              <p className="mt-2 text-2xl font-black text-white">{formatMoney(paidTotal)}</p>
            </Card>
            <Card>
              <span className="text-sm text-royal-muted">Organização</span>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-royal-gold" style={{ width: `${paidPercent}%` }} />
              </div>
              <p className="mt-2 text-sm text-zinc-300">{paidPercent}% das mensalidades listadas estão pagas</p>
            </Card>
          </div>

          <Card>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="section-kicker">Histórico financeiro</p>
                <h3 className="text-lg font-black text-white">Mensalidades</h3>
              </div>
              <Badge>{payments.length} registro(s)</Badge>
            </div>
            <div className="grid gap-3">
              {sortedPayments.length === 0 && <EmptyState>Nenhuma mensalidade gerada até agora.</EmptyState>}
              {sortedPayments.map((payment) => (
                <div key={payment.id} className={`rounded-lg border p-4 ${paymentCardClass(payment.status)}`}>
                  <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-white">{payment.reference_month}</h4>
                        {statusBadge(payment.status)}
                      </div>
                      <p className="mt-1 text-sm text-royal-muted">
                        Vencimento {formatDate(payment.due_date)} · {formatMoney(payment.value)}
                        {payment.paid_at ? ` · pago em ${formatDate(payment.paid_at)}` : ""}
                      </p>
                      <code className="mt-3 block rounded-lg border border-white/10 bg-black/35 p-3 text-xs text-zinc-300">{payment.pix_code}</code>
                    </div>
                    <Button variant={payment.status === "paid" ? "ghost" : "primary"} onClick={() => copyPix(payment)}>
                      <CreditCard size={16} /> Copiar PIX
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
      <div className="hidden">
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
  const [period, setPeriod] = useState(currentMonthValue());
  const periodLabel = formatMonthValue(period);
  const summary = useApi<FinanceSummary>(`/finance/summary?month=${period}`, token);
  const entries = useApi<FinanceEntry[]>(`/finance/entries?month=${period}`, token);
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
    const response = await fetch(`${API_URL}/finance/report/${format}?month=${period}`, {
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
    link.download = `relatorio-financeiro-filhos-do-rei-${period}.${format}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function sendWhatsAppReport() {
    if (!summary.data) return;

    const text = [
      "Relatório financeiro - Filhos do Rei BJJ",
      `Período: ${periodLabel}`,
      `Receitas do período: ${formatMoney(summary.data.income)}`,
      `Gastos do período: ${formatMoney(summary.data.expenses)}`,
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
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto] lg:items-end">
          <Field label="Mês de consulta" hint="Escolha o mês para ver histórico, lançamentos e relatórios">
            <Input type="month" value={period} onChange={(event) => setPeriod(event.target.value || currentMonthValue())} />
          </Field>
          <Button type="button" variant="ghost" onClick={() => setPeriod(shiftMonthValue(period, -1))}>
            Mês anterior
          </Button>
          <Button type="button" variant="ghost" onClick={() => setPeriod(currentMonthValue())}>
            Mês atual
          </Button>
          <Badge tone="gold">{periodLabel}</Badge>
        </div>
      </Card>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-white">Relatórios</h3>
            <p className="mt-1 text-sm text-royal-muted">Exporte o financeiro de {periodLabel} ou envie um resumo direto para o WhatsApp.</p>
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
          <StatCard icon={<CreditCard />} label="Receitas do período" value={formatMoney(summary.data.income)} />
          <StatCard icon={<CreditCard />} label="Gastos do período" value={formatMoney(summary.data.expenses)} danger />
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
      {!entries.loading && entries.data?.length === 0 && <EmptyState>Nenhum lançamento encontrado em {periodLabel}.</EmptyState>}
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
  const plans = useApi<MembershipPlan[]>("/plans", token);
  const [drafts, setDrafts] = useState<Record<string, { checkinStartTime: string; checkinEndTime: string; checkinDays: number[] }>>({});
  const [savingPlanId, setSavingPlanId] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const weekDays = [
    { value: 1, label: "Seg" },
    { value: 2, label: "Ter" },
    { value: 3, label: "Qua" },
    { value: 4, label: "Qui" },
    { value: 5, label: "Sex" },
    { value: 6, label: "Sab" },
    { value: 0, label: "Dom" }
  ];

  useEffect(() => {
    if (!plans.data) return;
    const planList = plans.data;
    setDrafts((current) => {
      const next = { ...current };
      for (const plan of planList) {
        if (!next[plan.id]) {
          next[plan.id] = {
            checkinStartTime: plan.checkin_start_time || "20:30",
            checkinEndTime: plan.checkin_end_time || "22:30",
            checkinDays: plan.checkin_days?.length ? plan.checkin_days : [1, 2, 3, 4, 5]
          };
        }
      }
      return next;
    });
  }, [plans.data]);

  async function saveSchedule(plan: MembershipPlan) {
    const draft = drafts[plan.id];
    if (!draft) return;
    setMessage("");
    setErrorMessage("");
    setSavingPlanId(plan.id);
    try {
      await request(`/plans/${plan.id}/checkin-schedule`, token, {
        method: "PATCH",
        body: JSON.stringify(draft)
      });
      setMessage(`Horário de check-in atualizado para ${plan.name}.`);
      plans.reload();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Não foi possível salvar o horário do plano.");
    } finally {
      setSavingPlanId("");
    }
  }

  function updateDraft(planId: string, patch: Partial<{ checkinStartTime: string; checkinEndTime: string; checkinDays: number[] }>) {
    setDrafts((current) => ({
      ...current,
      [planId]: {
        checkinStartTime: current[planId]?.checkinStartTime ?? "20:30",
        checkinEndTime: current[planId]?.checkinEndTime ?? "22:30",
        checkinDays: current[planId]?.checkinDays ?? [1, 2, 3, 4, 5],
        ...patch
      }
    }));
  }

  return (
    <div className="space-y-5">
      <PageTitle title="Aulas" subtitle="Dias de aula por plano e referência para lembretes do PWA" />
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-white">Grade automática por plano</h3>
            <p className="mt-1 text-sm text-royal-muted">
              O aluno faz check-in livremente no dia de aula. O horário abaixo serve como referência de aula e lembrete no PWA.
            </p>
          </div>
          <Badge tone="gold">Sem criação manual de aulas</Badge>
        </div>
        {plans.loading && <p className="mt-4 text-sm text-royal-muted">Carregando planos...</p>}
        {plans.error && <ErrorBox message={plans.error} />}
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {plans.data?.map((plan) => {
            const draft = drafts[plan.id] ?? {
              checkinStartTime: plan.checkin_start_time || "20:30",
              checkinEndTime: plan.checkin_end_time || "22:30",
              checkinDays: plan.checkin_days?.length ? plan.checkin_days : [1, 2, 3, 4, 5]
            };

            return (
              <Card key={plan.id} className="grid gap-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-white">{plan.name}</h3>
                    <p className="mt-1 text-sm text-royal-muted">{plan.audience} · {formatMoney(plan.monthly_value)}</p>
                  </div>
                  <Badge tone={plan.status === "active" ? "green" : "neutral"}>{plan.status === "active" ? "Ativo" : "Inativo"}</Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Aula começa">
                    <Input type="time" value={draft.checkinStartTime} onChange={(e) => updateDraft(plan.id, { checkinStartTime: e.target.value })} />
                  </Field>
                  <Field label="Aula termina">
                    <Input type="time" value={draft.checkinEndTime} onChange={(e) => updateDraft(plan.id, { checkinEndTime: e.target.value })} />
                  </Field>
                </div>
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-royal-gold/85">Dias liberados</p>
                  <div className="grid gap-2 sm:grid-cols-4">
                    {weekDays.map((day) => (
                      <CheckboxField
                        key={day.value}
                        label={day.label}
                        checked={draft.checkinDays.includes(day.value)}
                        onChange={(e) => {
                          const checkinDays = e.target.checked
                            ? [...draft.checkinDays, day.value]
                            : draft.checkinDays.filter((value) => value !== day.value);
                          updateDraft(plan.id, { checkinDays });
                        }}
                      />
                    ))}
                  </div>
                </div>
                <Button disabled={savingPlanId === plan.id || draft.checkinDays.length === 0} onClick={() => saveSchedule(plan)}>
                  <Save size={16} /> {savingPlanId === plan.id ? "Salvando..." : "Salvar grade do plano"}
                </Button>
              </Card>
            );
          })}
        </div>
        {errorMessage && <ErrorBox message={errorMessage} />}
        {message && <p className="mt-3 text-sm text-royal-gold">{message}</p>}
      </Card>
    </div>
  );
}

function CheckinsPanel({ token }: { token: string }) {
  const checkins = useApi<CheckinRequest[]>("/checkin-requests?status=all", token);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | CheckinRequest["status"]>("all");
  const [period, setPeriod] = useState(currentMonthValue());
  const [updatingId, setUpdatingId] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const records = checkins.data ?? [];
  const filteredRecords = useMemo(() => {
    const term = search.trim().toLowerCase();
    return records.filter((item) => {
      const recordMonth = monthValueFromDate(item.class_date || item.requested_at);
      const matchesPeriod = !period || recordMonth === period;
      const matchesStatus = status === "all" || item.status === status;
      const searchable = `${item.full_name} ${item.plan_name ?? ""} ${item.title} ${item.focus}`.toLowerCase();
      const matchesSearch = !term || searchable.includes(term);
      return matchesPeriod && matchesStatus && matchesSearch;
    });
  }, [period, records, search, status]);
  const stats = {
    total: filteredRecords.length,
    approved: filteredRecords.filter((item) => item.status === "approved").length,
    rejected: filteredRecords.filter((item) => item.status === "rejected").length,
    pending: filteredRecords.filter((item) => item.status === "pending").length,
    xp: filteredRecords.reduce((sum, item) => sum + Number(item.status === "approved" ? item.xp_awarded ?? 0 : 0), 0)
  };

  async function updateCheckin(item: CheckinRequest, nextStatus: "approved" | "rejected") {
    if (nextStatus === "rejected") {
      const confirmed = window.confirm(`Invalidar o check-in de ${item.full_name}? A presença e o XP desta aula serão removidos.`);
      if (!confirmed) return;
    }

    setMessage("");
    setErrorMessage("");
    setUpdatingId(item.id);
    try {
      await request(`/checkin-requests/${item.id}`, token, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus })
      });
      setMessage(nextStatus === "approved" ? "Check-in validado." : "Check-in invalidado e presença removida.");
      checkins.reload();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Não foi possível atualizar o check-in.");
    } finally {
      setUpdatingId("");
    }
  }

  return (
    <div className="space-y-5">
      <PageTitle title="Check-ins realizados" subtitle="Auditoria de presenças, XP aplicado e controle por aluno" />
      <div className="grid gap-3 md:grid-cols-4">
        <StatCard icon={<CalendarCheck />} label="Registros filtrados" value={stats.total} />
        <StatCard icon={<CheckCircle2 />} label="Confirmados" value={stats.approved} />
        <StatCard icon={<Shield />} label="Invalidados" value={stats.rejected} danger={stats.rejected > 0} />
        <StatCard icon={<Sparkles />} label="XP validado" value={`+${stats.xp}`} />
      </div>

      <Card>
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-royal-muted" size={16} />
            <Input className="pl-9" placeholder="Buscar por aluno, plano ou aula" value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
          <Input type="month" value={period} onChange={(event) => setPeriod(event.target.value || currentMonthValue())} />
          <Select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
            <option value="all">Todos</option>
            <option value="approved">Confirmados</option>
            <option value="rejected">Invalidados</option>
            <option value="pending">Pendentes</option>
          </Select>
        </div>
        {message && <p className="mt-3 text-sm font-semibold text-royal-gold">{message}</p>}
        {errorMessage && <ErrorBox message={errorMessage} />}
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-white">Histórico por aluno</h3>
            <p className="mt-1 text-sm text-royal-muted">Use esta lista para conferir quem marcou presença e invalidar check-ins falsos.</p>
          </div>
          <Badge tone="gold">{filteredRecords.length} registro(s)</Badge>
        </div>
        <div className="mt-4 grid gap-3">
          {checkins.loading && <p className="text-sm text-royal-muted">Carregando check-ins...</p>}
          {checkins.error && <ErrorBox message={checkins.error} />}
          {!checkins.loading && filteredRecords.length === 0 && <EmptyState>Nenhum check-in encontrado para os filtros atuais.</EmptyState>}
          {filteredRecords.map((item) => (
            <div key={item.id} className="grid gap-3 rounded-lg border border-royal-line bg-black/25 p-3 xl:grid-cols-[1fr_auto] xl:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Avatar src={item.photo_url} name={item.full_name} />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-white">{item.full_name}</p>
                      {checkinStatusBadge(item.status)}
                      <Badge>{item.belt}</Badge>
                      {item.plan_name && <Badge tone="gold">{item.plan_name}</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-royal-muted">
                      Aula {formatDate(item.class_date)} · check-in {formatDateTime(item.requested_at)}
                    </p>
                    {item.reviewed_at && <p className="mt-1 text-xs text-royal-muted">Última revisão: {formatDateTime(item.reviewed_at)}</p>}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                <Badge tone={item.status === "approved" ? "green" : item.status === "rejected" ? "red" : "gold"}>
                  +{Number(item.xp_awarded ?? 0)} XP
                </Badge>
                {item.status !== "approved" && (
                  <Button disabled={updatingId === item.id} onClick={() => updateCheckin(item, "approved")}>
                    <CheckCircle2 size={16} /> Validar
                  </Button>
                )}
                {item.status !== "rejected" && (
                  <Button variant="danger" disabled={updatingId === item.id} onClick={() => updateCheckin(item, "rejected")}>
                    <Trash2 size={16} /> Invalidar aula
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
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
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoMessage, setVideoMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todas");
  const [selectedTechniqueId, setSelectedTechniqueId] = useState("");
  const [videoLoadMessage, setVideoLoadMessage] = useState("");
  const showcaseRef = useRef<HTMLDivElement>(null);
  const techniques = data ?? [];
  const categories = useMemo(() => ["Todas", ...Array.from(new Set(techniques.map((item) => item.category))).sort()], [techniques]);
  const filteredTechniques = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return techniques.filter((technique) => {
      const matchesCategory = activeCategory === "Todas" || technique.category === activeCategory;
      const searchable = `${technique.name} ${technique.category} ${technique.description ?? ""} ${technique.notes ?? ""}`.toLowerCase();
      return matchesCategory && (!normalizedSearch || searchable.includes(normalizedSearch));
    });
  }, [activeCategory, searchTerm, techniques]);
  const selectedTechnique =
    filteredTechniques.find((technique) => technique.id === selectedTechniqueId) ??
    filteredTechniques.find((technique) => hasPlayableTechniqueVideo(technique.video_url)) ??
    filteredTechniques[0] ??
    null;
  const selectedVideoKind = techniqueVideoKind(selectedTechnique?.video_url);
  const selectedMediaUrl = selectedTechnique?.video_url ? mediaUrl(selectedTechnique.video_url) : "";
  const selectedYoutubeEmbedUrl = selectedVideoKind === "youtube" ? youtubeEmbedUrl(selectedMediaUrl) : "";
  const stats = {
    total: techniques.length,
    videos: techniques.filter((technique) => hasPlayableTechniqueVideo(technique.video_url)).length,
    learned: techniques.filter((technique) => technique.status === "learned").length,
    developing: techniques.filter((technique) => technique.status === "developing").length
  };

  useEffect(() => {
    if (isAdmin && students.data?.[0] && !studentId) setStudentId(students.data[0].id);
  }, [isAdmin, studentId, students.data]);

  useEffect(() => {
    if (!categories.includes(activeCategory)) setActiveCategory("Todas");
  }, [activeCategory, categories]);

  useEffect(() => {
    setVideoLoadMessage("");
  }, [selectedTechnique?.id]);

  async function updateStatus(techniqueId: string, status: Technique["status"]) {
    await request(`/techniques/${techniqueId}/status`, token, {
      method: "PATCH",
      body: JSON.stringify(isAdmin ? { studentId, status } : { status })
    });
    reload();
  }

  function openTechniqueVideo(technique: Technique) {
    setSelectedTechniqueId(technique.id);
    setVideoLoadMessage("");
    window.setTimeout(() => showcaseRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  async function uploadTechniqueVideo(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    setUploadingVideo(true);
    setVideoMessage("");
    try {
      const dataUrl = await videoFileToDataUrl(file);
      const result = await request<{ videoUrl: string }>("/techniques/video", token, {
        method: "POST",
        body: JSON.stringify({ fileName: file.name, dataUrl })
      });
      const nextForm = { ...techniqueForm, videoUrl: result.videoUrl };
      setTechniqueForm(nextForm);
      if (editingTechniqueId && nextForm.name.trim() && nextForm.category.trim()) {
        const saved = await request<Technique>(`/techniques/${editingTechniqueId}`, token, {
          method: "PUT",
          body: JSON.stringify(nextForm)
        });
        setSelectedTechniqueId(saved.id);
        setVideoMessage("Vídeo MP4 enviado, salvo e pronto para assistir.");
        reload();
      } else {
        setVideoMessage("Vídeo MP4 enviado. Clique em Adicionar ou Salvar para ele aparecer no mostruário.");
      }
    } catch (err) {
      setVideoMessage(err instanceof Error ? err.message : "Não foi possível enviar o vídeo.");
    } finally {
      setUploadingVideo(false);
    }
  }

  async function saveTechnique(event: React.FormEvent) {
    event.preventDefault();
    const saved = await request<Technique>(editingTechniqueId ? `/techniques/${editingTechniqueId}` : "/techniques", token, {
      method: editingTechniqueId ? "PUT" : "POST",
      body: JSON.stringify(techniqueForm)
    });
    setSelectedTechniqueId(saved.id);
    setEditingTechniqueId("");
    setTechniqueForm({ category: "Guarda Fechada", name: "", description: "", videoUrl: "", notes: "" });
    setVideoMessage("");
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
    setVideoMessage("");
  }

  async function removeTechnique(id: string) {
    await request(`/techniques/${id}`, token, { method: "DELETE" });
    reload();
  }

  return (
    <div className="space-y-5">
      <PageTitle title="Técnicas e evolução" subtitle="Mostruário técnico, vídeos de treino e evolução do aluno" />
      {isAdmin && (
        <Card className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_minmax(260px,360px)] lg:items-end">
            <div>
              <p className="section-kicker">Registro individual</p>
              <h3 className="text-lg font-black text-white">Progresso técnico por aluno</h3>
              <p className="mt-1 text-sm leading-6 text-royal-muted">
                Selecione um aluno para acompanhar quais técnicas ele marcou como aprendidas, em desenvolvimento ou não aprendidas.
              </p>
            </div>
            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-royal-gold">Aluno acompanhado</span>
              <Select value={studentId} onChange={(event) => setStudentId(event.target.value)}>
                {students.data?.map((student) => (
                  <option value={student.id} key={student.id}>
                    {student.full_name}
                  </option>
                ))}
              </Select>
            </label>
          </div>
          <form className="grid gap-3 lg:grid-cols-6" onSubmit={saveTechnique}>
            <Input placeholder="Categoria" value={techniqueForm.category} onChange={(e) => setTechniqueForm({ ...techniqueForm, category: e.target.value })} required />
            <Input placeholder="Nome da técnica" value={techniqueForm.name} onChange={(e) => setTechniqueForm({ ...techniqueForm, name: e.target.value })} required />
            <Input className="lg:col-span-2" placeholder="Descrição" value={techniqueForm.description} onChange={(e) => setTechniqueForm({ ...techniqueForm, description: e.target.value })} />
            <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-royal-gold/40 bg-royal-gold/10 px-4 text-sm font-semibold text-royal-gold transition hover:bg-royal-gold/15">
              <Upload size={16} /> {uploadingVideo ? "Enviando MP4..." : "Enviar MP4"}
              <input className="hidden" type="file" accept="video/mp4" disabled={uploadingVideo} onChange={uploadTechniqueVideo} />
            </label>
            <Button>
              <Save size={16} /> {editingTechniqueId ? "Salvar" : "Adicionar"}
            </Button>
            <Input className="lg:col-span-3" placeholder="Link do vídeo ou MP4 enviado" value={techniqueForm.videoUrl} onChange={(e) => setTechniqueForm({ ...techniqueForm, videoUrl: e.target.value })} />
            <Input className="lg:col-span-2" placeholder="Observações do professor" value={techniqueForm.notes} onChange={(e) => setTechniqueForm({ ...techniqueForm, notes: e.target.value })} />
            {videoMessage && <p className="text-sm font-semibold text-royal-gold lg:col-span-6">{videoMessage}</p>}
            {editingTechniqueId && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setEditingTechniqueId("");
                  setTechniqueForm({ category: "Guarda Fechada", name: "", description: "", videoUrl: "", notes: "" });
                  setVideoMessage("");
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
      {!loading && !error && (
        <>
          <Card>
            <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-center">
              <div>
                <p className="section-kicker">Biblioteca técnica</p>
                <h3 className="mt-1 text-xl font-black text-white">Mostruário de técnicas</h3>
                <p className="mt-2 text-sm leading-6 text-royal-muted">Filtre por categoria, procure a técnica e abra o vídeo sem misturar tudo na mesma lista.</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-4 xl:min-w-[520px]">
                <TechniqueMetric label="Técnicas" value={stats.total} />
                <TechniqueMetric label="Vídeos" value={stats.videos} />
                <TechniqueMetric label="Aprendidas" value={stats.learned} />
                <TechniqueMetric label="Evoluindo" value={stats.developing} />
              </div>
            </div>
            <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(220px,320px)_1fr]">
              <label className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-royal-muted" size={16} />
                <Input className="pl-9" placeholder="Buscar técnica, categoria ou observação" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
              </label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    className={`whitespace-nowrap rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                      activeCategory === category
                        ? "border-royal-gold bg-royal-gold text-black"
                        : "border-royal-line bg-black/25 text-zinc-300 hover:border-royal-gold hover:text-royal-gold"
                    }`}
                    onClick={() => setActiveCategory(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
            <Card className="min-h-[360px]">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="section-kicker">Lista filtrada</p>
                  <h3 className="text-lg font-black text-white">{filteredTechniques.length} técnica(s)</h3>
                </div>
                <Badge>{activeCategory}</Badge>
              </div>
              <div className="grid gap-3">
                {filteredTechniques.length === 0 && <EmptyState>Nenhuma técnica encontrada com esse filtro.</EmptyState>}
                {filteredTechniques.map((technique) => {
                  const isSelected = selectedTechnique?.id === technique.id;
                  const itemVideoKind = techniqueVideoKind(technique.video_url);
                  const itemHasPlayableVideo = itemVideoKind === "mp4" || itemVideoKind === "youtube" || itemVideoKind === "external";
                  return (
                    <div
                      key={technique.id}
                      className={`rounded-lg border p-4 transition ${
                        isSelected ? "border-royal-gold bg-royal-gold/10" : "border-royal-line bg-black/20 hover:border-royal-gold/50"
                      }`}
                    >
                      <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
                        <button type="button" className="min-w-0 text-left" onClick={() => setSelectedTechniqueId(technique.id)}>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-bold text-white">{technique.name}</h4>
                            {techniqueBadge(technique.status)}
                            {itemHasPlayableVideo && <Badge tone="gold">{itemVideoKind === "youtube" ? "YouTube" : "Vídeo"}</Badge>}
                            {itemVideoKind === "invalid" && <Badge tone="red">Link inválido</Badge>}
                          </div>
                          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-royal-gold/80">{technique.category}</p>
                          {technique.description && <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-300">{technique.description}</p>}
                          {technique.notes && <p className="mt-2 line-clamp-2 text-sm text-royal-muted">Obs: {technique.notes}</p>}
                        </button>
                        <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
                          {itemHasPlayableVideo && (
                            <Button variant={isSelected ? "primary" : "ghost"} className="min-h-8 px-3 text-xs" onClick={() => openTechniqueVideo(technique)}>
                              <Eye size={14} /> Assistir
                            </Button>
                          )}
                          {isAdmin && (
                            <>
                              <Button variant="ghost" className="min-h-8 px-3 text-xs" onClick={() => editTechnique(technique)}>
                                <Pencil size={14} /> Editar
                              </Button>
                              <Button variant="danger" className="min-h-8 px-3 text-xs" onClick={() => removeTechnique(technique.id)}>
                                <Trash2 size={14} /> Remover
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      {isAdmin ? (
                        <div className="mt-3 border-t border-royal-line pt-3 text-sm text-royal-muted">
                          Registro do aluno selecionado: <span className="font-semibold text-white">{techniqueStatus(technique.status)}</span>
                        </div>
                      ) : (
                        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-royal-line pt-3">
                          <span className="mr-1 text-xs font-bold uppercase tracking-[0.12em] text-royal-gold">Meu progresso</span>
                          {(["learned", "developing", "not_learned"] as const).map((status) => (
                            <Button key={status} variant={technique.status === status ? "primary" : "ghost"} className="min-h-8 px-3 text-xs" onClick={() => updateStatus(technique.id, status)}>
                              {techniqueStatus(status)}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>

            <div ref={showcaseRef} className="xl:sticky xl:top-4 xl:self-start">
              <Card>
                <p className="section-kicker">Mostruário</p>
                <h3 className="mt-1 text-lg font-black text-white">{selectedTechnique?.name ?? "Selecione uma técnica"}</h3>
                {selectedTechnique && selectedVideoKind === "mp4" ? (
                  <div className="mt-4 overflow-hidden rounded-lg border border-royal-line bg-black/45">
                    <video
                      key={selectedTechnique.id}
                      className="aspect-video w-full bg-black object-contain"
                      src={selectedMediaUrl}
                      controls
                      playsInline
                      preload="metadata"
                      onLoadedMetadata={() => setVideoLoadMessage("Vídeo carregado. Toque em play para assistir.")}
                      onError={() => setVideoLoadMessage("Não foi possível carregar o vídeo no player. Use Abrir vídeo ou Baixar MP4.")}
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-royal-line px-3 py-2">
                      <span className="text-xs font-semibold text-royal-muted">{selectedTechnique.category}</span>
                      <div className="flex flex-wrap gap-3">
                        <a className="inline-flex items-center gap-2 text-sm font-semibold text-royal-gold hover:text-yellow-200" href={selectedMediaUrl} target="_blank" rel="noreferrer">
                          <Eye size={14} /> Abrir vídeo
                        </a>
                        <a className="inline-flex items-center gap-2 text-sm font-semibold text-royal-gold hover:text-yellow-200" href={selectedMediaUrl} download target="_blank" rel="noreferrer">
                          <Download size={14} /> Baixar MP4
                        </a>
                      </div>
                    </div>
                  </div>
                ) : selectedTechnique && selectedVideoKind === "youtube" && selectedYoutubeEmbedUrl ? (
                  <div className="mt-4 overflow-hidden rounded-lg border border-royal-line bg-black/45">
                    <iframe
                      key={selectedTechnique.id}
                      className="aspect-video w-full bg-black"
                      src={selectedYoutubeEmbedUrl}
                      title={selectedTechnique.name}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-royal-line px-3 py-2">
                      <span className="text-xs font-semibold text-royal-muted">{selectedTechnique.category}</span>
                      <a className="inline-flex items-center gap-2 text-sm font-semibold text-royal-gold hover:text-yellow-200" href={selectedMediaUrl} target="_blank" rel="noreferrer">
                        <Eye size={14} /> Abrir no YouTube
                      </a>
                    </div>
                  </div>
                ) : selectedVideoKind === "external" ? (
                  <div className="mt-4 rounded-lg border border-royal-line bg-black/30 p-4">
                    <p className="text-sm leading-6 text-zinc-300">Esse vídeo está em um link externo. Abra em uma nova aba para assistir.</p>
                    <a className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-royal-gold hover:text-yellow-200" href={selectedMediaUrl} target="_blank" rel="noreferrer">
                      <Eye size={14} /> Abrir vídeo
                    </a>
                  </div>
                ) : selectedVideoKind === "invalid" ? (
                  <EmptyState>O link salvo para essa técnica não é válido. Edite a técnica e envie um MP4 ou informe uma URL completa.</EmptyState>
                ) : (
                  <EmptyState>{selectedTechnique ? "Essa técnica ainda não tem vídeo cadastrado." : "Selecione uma técnica da lista para ver o vídeo."}</EmptyState>
                )}
                {videoLoadMessage && <p className="mt-3 text-sm font-semibold text-royal-gold">{videoLoadMessage}</p>}
                {selectedTechnique && (
                  <div className="mt-4 space-y-2 text-sm leading-6 text-zinc-300">
                    {selectedTechnique.description && <p>{selectedTechnique.description}</p>}
                    {selectedTechnique.notes && <p className="text-royal-muted">Obs: {selectedTechnique.notes}</p>}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function TechniqueMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-royal-line bg-black/25 px-3 py-2">
      <span className="block text-xs font-semibold text-royal-muted">{label}</span>
      <strong className="mt-1 block text-xl text-white">{value}</strong>
    </div>
  );
}

function RankingPanel({ token, currentStudentId }: { token: string; currentStudentId?: string }) {
  const [scope, setScope] = useState("monthly");
  const { data, loading, error } = useApi<RankingItem[]>(`/ranking?scope=${scope}`, token);
  const ranking = data ?? [];
  const topThree = ranking.slice(0, 3);
  const otherStudents = ranking.slice(3);
  const champion = ranking[0];
  const currentStudent = currentStudentId ? ranking.find((item) => item.id === currentStudentId) : null;
  const maxTrainings = Math.max(...ranking.map((item) => item.trainings), 1);
  const maxXp = Math.max(...ranking.map((item) => item.xp), 1);
  const totalTrainings = ranking.reduce((sum, item) => sum + item.trainings, 0);

  return (
    <div className="space-y-5">
      <PageTitle title="Ranking" subtitle="Disputa saudável, frequência no tatame e evolução dos alunos" />
      <Card className="overflow-hidden">
        <div className="grid gap-5 xl:grid-cols-[1fr_auto] xl:items-center">
          <div>
            <p className="section-kicker">Corrida do tatame</p>
            <h3 className="mt-1 text-2xl font-black text-white">
              {champion ? `${champion.full_name} lidera o desafio` : "Ranking aguardando treinos"}
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-royal-muted">
              Acompanhe quem mais treinou no período. O ranking combina presença e XP para manter a disputa divertida.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 xl:min-w-[460px]">
            <RankingMetric label="Atletas" value={ranking.length} />
            <RankingMetric label="Treinos" value={totalTrainings} />
            <RankingMetric label="Líder" value={champion ? `#${champion.position}` : "-"} />
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {[
            ["weekly", "Semanal"],
            ["monthly", "Mensal"],
            ["general", "Geral"]
          ].map(([key, label]) => (
            <Button key={key} variant={scope === key ? "primary" : "ghost"} onClick={() => setScope(key)}>
              {label}
            </Button>
          ))}
        </div>
      </Card>
      {loading && <Loading title="Carregando ranking" />}
      {error && <ErrorBox message={error} />}
      {!loading && !error && (
        <>
          {currentStudent && (
            <Card className="border-royal-gold/40 bg-royal-gold/10">
              <div className="grid gap-3 md:grid-cols-[auto_1fr_auto] md:items-center">
                <Avatar src={currentStudent.photo_url} name={currentStudent.full_name} />
                <div>
                  <p className="section-kicker">Sua posição</p>
                  <h3 className="text-lg font-black text-white">#{currentStudent.position} - {currentStudent.full_name}</h3>
                  <p className="mt-1 text-sm text-zinc-300">{currentStudent.trainings} treinos · nível {currentStudent.level} · {currentStudent.xp} XP</p>
                </div>
                <Badge tone="gold">{rankingMotivation(currentStudent.position)}</Badge>
              </div>
            </Card>
          )}

          <div className="grid gap-4 lg:grid-cols-3">
            {topThree.map((item, index) => (
              <Card key={item.id} className={`relative overflow-hidden ${index === 0 ? "border-royal-gold/60 bg-royal-gold/10 lg:-translate-y-2" : ""}`}>
                <div className="absolute right-4 top-4 text-5xl font-black text-white/5">#{item.position}</div>
                <div className="relative flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`grid h-12 w-12 place-items-center rounded-full border ${podiumTone(index)}`}>
                      {index === 0 ? <Trophy size={22} /> : index === 1 ? <Medal size={22} /> : <Award size={22} />}
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal-gold">{podiumLabel(index)}</p>
                      <h3 className="mt-1 font-black text-white">{item.full_name}</h3>
                    </div>
                  </div>
                  <Avatar src={item.photo_url} name={item.full_name} />
                </div>
                <div className="relative mt-5 grid gap-3">
                  <RankingProgress label="Treinos" value={item.trainings} max={maxTrainings} suffix="treinos" />
                  <RankingProgress label="XP" value={item.xp} max={maxXp} suffix="XP" />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Badge tone="gold">Nível {item.level}</Badge>
                  <Badge>{item.belt}</Badge>
                </div>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
            <Card>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="section-kicker">Tabela geral</p>
                  <h3 className="text-lg font-black text-white">Atletas em movimento</h3>
                </div>
                <Badge>{rankingScopeLabel(scope)}</Badge>
              </div>
              <div className="grid gap-3">
                {ranking.length === 0 && <EmptyState>Nenhum treino registrado para este período.</EmptyState>}
                {otherStudents.map((item) => {
                  const isCurrent = item.id === currentStudentId;
                  return (
                    <div key={item.id} className={`rounded-lg border p-3 ${isCurrent ? "border-royal-gold bg-royal-gold/10" : "border-royal-line bg-black/20"}`}>
                      <div className="grid gap-3 md:grid-cols-[auto_auto_1fr_auto] md:items-center">
                        <span className="text-xl font-black text-royal-gold">#{item.position}</span>
                        <Avatar src={item.photo_url} name={item.full_name} />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-bold text-white">{item.full_name}</h4>
                            {isCurrent && <Badge tone="gold">Você</Badge>}
                          </div>
                          <p className="text-sm text-royal-muted">{item.belt} · nível {item.level} · {item.xp} XP</p>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                            <div className="h-full rounded-full bg-royal-gold" style={{ width: `${Math.max(8, (item.trainings / maxTrainings) * 100)}%` }} />
                          </div>
                        </div>
                        <Badge tone="gold">{item.trainings} treinos</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="xl:sticky xl:top-4 xl:self-start">
              <p className="section-kicker">Desafio</p>
              <h3 className="mt-1 text-lg font-black text-white">{rankingScopeLabel(scope)}</h3>
              <div className="mt-4 rounded-lg border border-royal-gold/30 bg-royal-gold/10 p-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="text-royal-gold" size={20} />
                  <p className="font-bold text-white">{rankingChallenge(scope)}</p>
                </div>
                <p className="mt-3 text-sm leading-6 text-zinc-300">
                  Cada check-in validado aumenta sua presença no ranking. Use isso como um jogo saudável de constância.
                </p>
              </div>
              <div className="mt-4 grid gap-2">
                {topThree.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-lg border border-royal-line bg-black/25 px-3 py-2 text-sm">
                    <span className="font-semibold text-white">#{item.position} {item.full_name}</span>
                    <span className="text-royal-gold">{item.trainings} treinos</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function RankingMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-royal-line bg-black/25 px-3 py-2">
      <span className="block text-xs font-semibold text-royal-muted">{label}</span>
      <strong className="mt-1 block text-xl text-white">{value}</strong>
    </div>
  );
}

function RankingProgress({ label, value, max, suffix }: { label: string; value: number; max: number; suffix: string }) {
  const percent = Math.max(8, Math.min(100, (value / Math.max(max, 1)) * 100));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-xs font-semibold text-royal-muted">
        <span>{label}</span>
        <span>{value} {suffix}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-royal-gold" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function podiumLabel(index: number) {
  return ["Campeão do período", "Vice-líder", "Terceiro lugar"][index] ?? "Destaque";
}

function podiumTone(index: number) {
  if (index === 0) return "border-royal-gold/70 bg-royal-gold text-black";
  if (index === 1) return "border-zinc-300/50 bg-zinc-200 text-zinc-900";
  return "border-orange-300/50 bg-orange-300 text-zinc-950";
}

function rankingScopeLabel(scope: string) {
  if (scope === "weekly") return "Ranking semanal";
  if (scope === "general") return "Ranking geral";
  return "Ranking mensal";
}

function rankingMotivation(position: number) {
  if (position <= 1) return "Liderando";
  if (position <= 3) return "No pódio";
  if (position <= 10) return "Na disputa";
  return "Continue subindo";
}

function rankingChallenge(scope: string) {
  if (scope === "weekly") return "Meta da semana: aparecer no top 3";
  if (scope === "general") return "Meta geral: manter constância no tatame";
  return "Meta do mês: somar treinos e subir posições";
}

function StorePanel({ token, isAdmin = false }: { token: string; isAdmin?: boolean }) {
  const { data, loading, error, reload } = useApi<Product[]>("/products", token);
  const [editingProductId, setEditingProductId] = useState("");
  const [saleQuantities, setSaleQuantities] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ name: "", category: "Kimono", price: "", stock: "", imageUrl: "", available: true });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageMessage, setImageMessage] = useState("");

  async function createProduct(event: React.FormEvent) {
    event.preventDefault();
    await request(editingProductId ? `/products/${editingProductId}` : "/products", token, {
      method: editingProductId ? "PUT" : "POST",
      body: JSON.stringify({ ...form, price: Number(form.price), stock: Number(form.stock) })
    });
    setEditingProductId("");
    setForm({ name: "", category: "Kimono", price: "", stock: "", imageUrl: "", available: true });
    setImageMessage("");
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
    setImageMessage("");
  }

  async function uploadProductImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    setUploadingImage(true);
    setImageMessage("");
    try {
      const dataUrl = await productImageFileToDataUrl(file);
      const result = await request<{ imageUrl: string }>("/products/image", token, {
        method: "POST",
        body: JSON.stringify({ fileName: file.name, dataUrl })
      });
      const nextForm = { ...form, imageUrl: result.imageUrl };
      setForm(nextForm);

      if (editingProductId && nextForm.name.trim() && nextForm.price && nextForm.stock) {
        await request(`/products/${editingProductId}`, token, {
          method: "PUT",
          body: JSON.stringify({ ...nextForm, price: Number(nextForm.price), stock: Number(nextForm.stock) })
        });
        setImageMessage("Imagem enviada, salva e aplicada ao produto.");
        reload();
      } else {
        setImageMessage("Imagem enviada. Clique em Produto ou Salvar para aplicar na loja.");
      }
    } catch (err) {
      setImageMessage(err instanceof Error ? err.message : "Não foi possível enviar a imagem.");
    } finally {
      setUploadingImage(false);
    }
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

  async function removeProduct(product: Product) {
    const confirmed = window.confirm(`Excluir "${product.name}" da loja? O histórico financeiro já lançado será preservado.`);
    if (!confirmed) return;

    const result = await request<{ archived?: boolean } | undefined>(`/products/${product.id}`, token, { method: "DELETE" });
    setMessage(result?.archived ? "Produto removido da loja e histórico preservado." : "Produto excluído da loja.");
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
            <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-royal-gold/40 bg-royal-gold/10 px-4 text-sm font-semibold text-royal-gold transition hover:bg-royal-gold/15">
              <Upload size={16} /> {uploadingImage ? "Enviando..." : "Enviar imagem"}
              <input className="hidden" type="file" accept="image/png,image/jpeg,image/webp" disabled={uploadingImage} onChange={uploadProductImage} />
            </label>
            <Button>
              <Save size={16} /> {editingProductId ? "Salvar" : "Produto"}
            </Button>
            <Input className="md:col-span-3" placeholder="Link da imagem ou imagem enviada" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
            <Select className="md:col-span-2" value={String(form.available)} onChange={(e) => setForm({ ...form, available: e.target.value === "true" })}>
              <option value="true">Disponível</option>
              <option value="false">Indisponível</option>
            </Select>
            {imageMessage && <p className="text-sm font-semibold text-royal-gold md:col-span-6">{imageMessage}</p>}
            {editingProductId && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setEditingProductId("");
                  setForm({ name: "", category: "Kimono", price: "", stock: "", imageUrl: "", available: true });
                  setImageMessage("");
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
            <img className="h-48 w-full object-cover" src={product.image_url ? mediaUrl(product.image_url) : "/icon.svg"} alt={product.name} />
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
                    <Button variant="danger" onClick={() => removeProduct(product)}>
                      <Trash2 size={16} /> Excluir
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
        <p className="text-xs font-semibold uppercase tracking-wider text-royal-gold">WILIAN LAGO</p>
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

function StatCard({ icon, label, value, danger = false }: { icon: ReactNode; label: string; value: ReactNode; danger?: boolean }) {
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

function DevelopmentSignal({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="development-signal">
      <span>{icon}</span>
      <strong>{title}</strong>
      <small>{text}</small>
    </div>
  );
}

function EvolutionStat({ icon, label, value, danger = false }: { icon: ReactNode; label: string; value: ReactNode; danger?: boolean }) {
  return (
    <div className={`evolution-stat ${danger ? "is-danger" : ""}`}>
      <span>{icon}</span>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
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
  const safeStripes = normalizeStripeCount(stripes);
  const hasClassGoal = remaining !== null && remaining !== undefined && Number.isFinite(Number(remaining));
  const classesLeft = hasClassGoal ? Math.max(0, Number(remaining)) : null;
  const ready = hasClassGoal && classesLeft === 0;
  const nextStep = safeStripes >= 4 ? "próxima faixa" : "próximo grau";
  const theme = beltTheme(belt);
  const degreeSteps = [1, 2, 3, 4];
  const graduationLabel = formatGraduationLabel(belt, safeStripes);
  const attendanceBadge = !hasClassGoal
    ? "Meta ainda não definida"
    : ready
      ? "Pronto para avaliação"
      : `Faltam ${classesLeft} ${classesLeft === 1 ? "aula" : "aulas"}`;
  const quote = quoteByBelt(theme.key);
  const beltStyle = {
    "--belt-color-start": theme.start,
    "--belt-color-middle": theme.middle,
    "--belt-color-end": theme.end,
    "--belt-text": theme.text
  } as CSSProperties;

  return (
    <section
      className={`belt-card evolution-belt-card ${compact ? "is-compact" : ""}`}
      data-belt-theme={theme.key}
      aria-label={`Graduação atual: ${graduationLabel}`}
    >
      <div className="belt-header">
        <div>
          <p className="section-kicker">Sua graduação</p>
          <h3>{graduationLabel}</h3>
          {!compact && <small>{quote}</small>}
        </div>
        <Badge tone={ready ? "green" : "gold"}>
          <span className="inline-flex items-center gap-1">
            <CalendarCheck size={13} /> {attendanceBadge}
          </span>
        </Badge>
      </div>

      <div
        className="jiu-belt"
        style={beltStyle}
        role="img"
        title={`${graduationLabel}. ${safeStripes} de 4 graus conquistados.`}
        aria-label={`${graduationLabel}. ${safeStripes} de 4 graus conquistados.`}
      >
        <span className="belt-label">Faixa {belt || "Branca"}</span>
        <span className="belt-rank-panel" aria-hidden="true">
          {degreeSteps.map((step) => (
            <span key={step} className={`belt-stripe ${step <= safeStripes ? "is-earned" : ""}`} />
          ))}
        </span>
      </div>

      {!compact && (
        <>
          <div className="degree-roadmap" aria-label="Linha de progressão dos graus">
            {degreeSteps.map((step) => {
              const status = degreeStatus(step, safeStripes);
              const label = status === "completed" ? "Concluído" : status === "current" ? "Próximo" : "Futuro";
              const tooltip = status === "completed"
                ? `${step}º grau conquistado`
                : status === "current"
                  ? hasClassGoal
                    ? `${step}º grau. ${attendanceBadge}.`
                    : `${step}º grau. Meta ainda não definida.`
                  : `${step}º grau futuro`;

              return (
                <div className={`degree-step is-${status}`} key={step} title={tooltip}>
                  <span>{step}º</span>
                  <strong>{step}º grau</strong>
                  <small>{label}</small>
                </div>
              );
            })}
          </div>

          <div className="next-degree-card">
            <div>
              <p>Progresso para o {nextStep}</p>
              <strong>{attendanceBadge}</strong>
            </div>
            <span>{safeStripes >= 4 ? "Próxima faixa" : `${safeStripes + 1}º grau`}</span>
          </div>

          <div className="graduation-note">
            <LockKeyhole size={18} />
            <p>
              A graduação é definida pelo <strong>professor</strong>. O aluno acompanha o progresso, as aulas e os próximos objetivos.
            </p>
          </div>
        </>
      )}
    </section>
  );
}

function safeNumber(value: unknown) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? Math.max(0, numeric) : 0;
}

function normalizeStripeCount(value: unknown) {
  return Math.min(4, Math.max(0, Math.trunc(safeNumber(value))));
}

function formatGraduationLabel(belt: string, stripes: number) {
  const safeBelt = belt || "Branca";
  if (stripes <= 0) return `Faixa ${safeBelt} • Sem graus`;
  return `Faixa ${safeBelt} • ${stripes} de 4 graus`;
}

function degreeStatus(step: number, currentStripes: number) {
  if (step <= currentStripes) return "completed";
  if (currentStripes < 4 && step === currentStripes + 1) return "current";
  return "locked";
}

function normalizeBeltTheme(belt: string) {
  const value = String(belt || "").trim().toLowerCase();
  const map: Record<string, string> = {
    branca: "white",
    white: "white",
    cinza: "gray",
    gray: "gray",
    grey: "gray",
    amarela: "yellow",
    yellow: "yellow",
    laranja: "orange",
    orange: "orange",
    verde: "green",
    green: "green",
    azul: "blue",
    blue: "blue",
    roxa: "purple",
    purple: "purple",
    marrom: "brown",
    brown: "brown",
    preta: "black",
    black: "black"
  };

  return map[value] ?? "white";
}

function quoteByBelt(theme: string) {
  const quotes: Record<string, string> = {
    white: "Todo faixa-preta começou aqui.",
    gray: "A base é construída com constância.",
    yellow: "Disciplina transforma treino em evolução.",
    orange: "Continue evoluindo, treino após treino.",
    green: "A técnica começa a ganhar identidade.",
    blue: "Constância transforma técnica em confiança.",
    purple: "Refine os detalhes.",
    brown: "A excelência está nos pequenos ajustes.",
    black: "A faixa muda. O aprendizado continua."
  };

  return quotes[theme] ?? "A disciplina vence o talento.";
}

function beltTheme(belt: string) {
  const key = normalizeBeltTheme(belt);
  const themes: Record<string, { key: string; start: string; middle: string; end: string; text: string }> = {
    white: { key, start: "#ffffff", middle: "#eeeeee", end: "#cfcfcf", text: "#111111" },
    gray: { key, start: "#9ca3af", middle: "#6b7280", end: "#3f3f46", text: "#ffffff" },
    yellow: { key, start: "#ffe26a", middle: "#facc15", end: "#b77908", text: "#111111" },
    orange: { key, start: "#fb923c", middle: "#ea580c", end: "#9a3412", text: "#ffffff" },
    green: { key, start: "#4ade80", middle: "#16a34a", end: "#14532d", text: "#ffffff" },
    blue: { key, start: "#2e75ff", middle: "#1958c7", end: "#123d8f", text: "#ffffff" },
    purple: { key, start: "#9a5cff", middle: "#7336c9", end: "#4f228d", text: "#ffffff" },
    brown: { key, start: "#9a643d", middle: "#754728", end: "#4f2d18", text: "#ffffff" },
    black: { key, start: "#202020", middle: "#0e0e0e", end: "#050505", text: "#ffffff" }
  };

  return themes[key] ?? themes.white;
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

function productImageFileToDataUrl(file: File) {
  if (!file.type.startsWith("image/")) {
    return Promise.reject(new Error("Selecione uma imagem PNG, JPG ou WEBP."));
  }

  if (file.size > 8 * 1024 * 1024) {
    return Promise.reject(new Error("Escolha uma imagem de até 8 MB."));
  }

  return new Promise<string>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      const maxSize = 1400;
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
        file.type === "image/png" ? "image/png" : "image/jpeg",
        0.9
      );
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Não foi possível abrir a imagem."));
    };

    image.src = objectUrl;
  });
}

function videoFileToDataUrl(file: File) {
  if (file.type !== "video/mp4" && !file.name.toLowerCase().endsWith(".mp4")) {
    return Promise.reject(new Error("Selecione um arquivo MP4."));
  }

  if (file.size > 50 * 1024 * 1024) {
    return Promise.reject(new Error("Envie um vídeo de até 50 MB."));
  }

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível ler o vídeo."));
    reader.readAsDataURL(file);
  });
}

function mediaUrl(value?: string | null) {
  if (!value) return "";
  if (/^http:\/\//.test(value) && window.location.protocol === "https:") return value.replace(/^http:\/\//, "https://");
  if (/^(https?:|data:|blob:)/.test(value)) return value;
  const apiOrigin = API_URL.replace(/\/api\/?$/, "");
  return `${apiOrigin}${value.startsWith("/") ? value : `/${value}`}`;
}

function techniqueVideoKind(value?: string | null) {
  const raw = value?.trim();
  if (!raw) return "none";
  if (/^(data:video\/|blob:)/.test(raw)) return "mp4";
  if (raw.startsWith("/api/techniques/video/")) return "mp4";
  if (!/^https?:\/\//.test(raw)) return "invalid";

  const normalized = mediaUrl(raw);
  if (youtubeEmbedUrl(normalized)) return "youtube";
  if (/\.mp4($|\?)/i.test(normalized) || normalized.includes("/api/techniques/video/")) return "mp4";
  return "external";
}

function hasPlayableTechniqueVideo(value?: string | null) {
  const kind = techniqueVideoKind(value);
  return kind === "mp4" || kind === "youtube" || kind === "external";
}

function youtubeEmbedUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");
    let id = "";
    if (host === "youtu.be") id = url.pathname.split("/").filter(Boolean)[0] ?? "";
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (url.pathname === "/watch") id = url.searchParams.get("v") ?? "";
      if (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/embed/")) {
        id = url.pathname.split("/").filter(Boolean)[1] ?? "";
      }
    }
    return id ? `https://www.youtube.com/embed/${id}` : "";
  } catch {
    return "";
  }
}

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthValueFromDate(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonthValue(value: string, amount: number) {
  const [year, month] = value.split("-").map(Number);
  const date = new Date(year, month - 1 + amount, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthValue(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
}

function formatWeekDays(days?: number[]) {
  if (!days?.length) return "Sem dias definidos";
  const labels: Record<number, string> = {
    0: "Dom",
    1: "Seg",
    2: "Ter",
    3: "Qua",
    4: "Qui",
    5: "Sex",
    6: "Sab"
  };
  return [...days].sort((a, b) => a - b).map((day) => labels[day] ?? String(day)).join(", ");
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

function checkinStatusBadge(status?: string | null) {
  if (status === "approved") return <Badge tone="green">Confirmado</Badge>;
  if (status === "rejected") return <Badge tone="red">Recusado</Badge>;
  if (status === "pending") return <Badge tone="gold">Pendente</Badge>;
  return <Badge>Sem status</Badge>;
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
