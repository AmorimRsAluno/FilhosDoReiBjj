export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3333/api";

export type Role = "admin" | "teacher" | "student" | "finance";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export type Session = {
  token: string;
  user: User;
  student?: StudentSummary | null;
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
  status: string;
  goals: string;
  monthly_attendance: string;
  payment_status: "paid" | "pending" | "overdue" | null;
  due_date: string | null;
  payment_value: string | null;
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
  nextClass: { id: string; title: string; class_date: string; focus: string } | null;
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
  class_id: string;
  title: string;
  class_date: string;
  focus: string;
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
  focus: string;
  teacher_name: string;
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
