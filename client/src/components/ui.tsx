import type { InputHTMLAttributes, ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-lg border border-white/10 bg-[linear-gradient(145deg,rgba(27,27,27,.96),rgba(10,10,10,.96))] p-4 shadow-gold ${className}`}
    >
      {children}
    </section>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
}) {
  const styles = {
    primary: "bg-royal-gold text-black shadow-[0_0_24px_rgba(255,196,15,.16)] hover:bg-yellow-300",
    ghost: "border border-white/10 bg-white/[.03] text-white hover:border-royal-gold hover:text-royal-gold",
    danger: "bg-royal-red text-white hover:bg-red-500"
  };

  return (
    <button
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`min-h-11 w-full rounded-lg border border-royal-line bg-black/30 px-3 text-sm text-white outline-none transition placeholder:text-zinc-500 focus:border-royal-gold ${className}`}
      {...props}
    />
  );
}

export function Select({ className = "", ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`min-h-11 w-full rounded-lg border border-royal-line bg-black/30 px-3 text-sm text-white outline-none transition focus:border-royal-gold disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  className = "",
  children
}: {
  label: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-royal-gold/85">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-royal-muted">{hint}</span>}
    </label>
  );
}

export function CheckboxField({
  label,
  hint,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
}) {
  return (
    <label className={`flex min-h-11 items-center gap-3 rounded-lg border border-royal-line bg-black/30 px-3 py-2 text-sm text-zinc-200 ${className}`}>
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-royal-line bg-black accent-royal-gold"
        {...props}
      />
      <span>
        <span className="block font-semibold text-white">{label}</span>
        {hint && <span className="block text-xs text-royal-muted">{hint}</span>}
      </span>
    </label>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "gold" | "red" | "green" | "neutral" }) {
  const tones = {
    gold: "border-royal-gold/40 bg-royal-gold/10 text-royal-gold",
    red: "border-royal-red/40 bg-royal-red/10 text-red-300",
    green: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
    neutral: "border-royal-line bg-white/5 text-zinc-300"
  };

  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-dashed border-royal-line p-6 text-center text-sm text-royal-muted">{children}</div>;
}
