export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3333/api";

export type Role = "admin" | "teacher" | "student" | "finance";

export type User = {
  id: string;
  name: string;
  username?: string | null;
  email: string;
  role: Role;
  phone?: string | null;
  permissions?: string[];
};

export type Session = {
  token: string;
  user: User;
  student?: StudentSummary | null;
};

export type AdminUser = User & {
  created_at: string;
  permissions: string[];
};

export type RegistrationRequest = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  status: "pending" | "approved" | "rejected";
  requested_at: string;
  reviewed_at: string | null;
  note: string | null;
};

export type PasswordResetRequest = {
  id: string;
  email: string | null;
  phone: string | null;
  status: "pending" | "resolved" | "rejected";
  requested_at: string;
  reviewed_at: string | null;
  note: string | null;
  user_id: string | null;
  user_name: string | null;
};

export type StudentSummary = {
  id: string;
  full_name: string;
  belt: string;
  stripe_count: number;
  classes_until_next_stripe: number;
  photo_url: string;
  xp: number;
  level: number;
};

export type Student = StudentSummary & {
  email: string;
  phone: string;
  phone_ddd: string | null;
  birth_date: string | null;
  cpf: string | null;
  address: string | null;
  zip_code: string | null;
  plan_id: string | null;
  plan_name: string | null;
  plan_value: string | null;
  plan_due_day: number | null;
  plan_status: string | null;
  billing_due_date: string | null;
  billing_notify: boolean;
  status: string;
  goals: string;
  monthly_attendance: string;
  payment_status: "paid" | "pending" | "overdue" | null;
  due_date: string | null;
  payment_value: string | null;
};

export type MembershipPlan = {
  id: string;
  name: string;
  audience: string;
  monthly_value: string;
  due_day: number;
  billing_cycle: "monthly";
  status: "active" | "inactive";
  checkin_start_time: string;
  checkin_end_time: string;
  checkin_days: number[];
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminDashboard = {
  cards: {
    activeStudents: number;
    monthlyRevenue: number;
    overduePayments: number;
    monthlyAttendance: number;
    newStudents: number;
  };
  payments: Array<{ status: string; total: number }>;
  evolution: Array<{ label: string; xp: number }>;
};

export type StudentDashboard = {
  student: StudentSummary & { goals: string };
  monthlyAttendance: number;
  nextClass: {
    id: string;
    title: string;
    class_date: string;
    focus: string;
    checkin_start_at: string;
    checkin_end_at: string;
    checkin_open: boolean;
    plan_names?: string[];
  } | null;
  payment: Payment | null;
  techniqueSummary: Array<{ status: string; total: number }>;
  rankingPosition: number;
  checkin: StudentCheckin | null;
};

export type StudentCheckin = {
  id: string;
  status: "pending" | "approved" | "rejected";
  requested_at: string;
  reviewed_at: string | null;
  xp_awarded: number;
  class_id: string;
  title: string;
  class_date: string;
  focus: string;
};

export type CheckinRequest = {
  id: string;
  status: "pending" | "approved" | "rejected";
  requested_at: string;
  reviewed_at: string | null;
  xp_awarded: number;
  student_id: string;
  full_name: string;
  photo_url: string;
  belt: string;
  plan_name?: string | null;
  class_id: string;
  title: string;
  class_date: string;
  focus: string;
  checkin_start_at?: string;
  checkin_end_at?: string;
};

export type Payment = {
  id: string;
  reference_month: string;
  due_date: string;
  paid_at: string | null;
  value: string;
  status: "paid" | "pending" | "overdue";
  pix_code: string;
};

export type FinanceSummary = {
  income: number;
  membershipIncome: number;
  extraIncome: number;
  expenses: number;
  profit: number;
  receivable: number;
};

export type FinanceEntry = {
  id: string;
  type: "income" | "expense";
  category: string;
  description: string;
  amount: string;
  entry_date: string;
  status: "paid" | "pending";
  payment_method: string;
  notes: string;
  created_by_name?: string;
};

export type Technique = {
  id: string;
  category: string;
  name: string;
  description: string;
  video_url: string | null;
  notes: string | null;
  status: "learned" | "developing" | "not_learned";
};

export type ClassItem = {
  id: string;
  title: string;
  class_date: string;
  checkin_start_at: string;
  checkin_end_at: string;
  focus: string;
  teacher_name: string;
  plan_ids?: string[];
  plan_names?: string[];
  attendees: number;
};

export type RankingItem = {
  id: string;
  full_name: string;
  photo_url: string;
  belt: string;
  xp: number;
  level: number;
  trainings: number;
  position: number;
};

export type Product = {
  id: string;
  name: string;
  category: string;
  price: string;
  stock: number;
  image_url: string;
  available: boolean;
  pix_code: string;
};

export type Competition = {
  id: string;
  name: string;
  event_date: string;
  location: string;
  registration_fee: string;
  status: string;
  confirmed_students: number;
};

export type Post = {
  id: string;
  title: string;
  body: string;
  video_url: string | null;
  author_name: string;
  likes: number;
  comments: number;
  created_at: string;
};

export async function request<T>(path: string, token?: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Erro na requisição." }));
    throw new Error(error.message ?? "Erro na requisição.");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export function formatMoney(value: number | string | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value ?? 0));
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(value));
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}
