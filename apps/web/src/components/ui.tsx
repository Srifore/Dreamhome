import clsx from "clsx";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-start justify-between gap-4 rounded-lg border border-slate-200 p-3 text-left transition-colors hover:bg-slate-50"
    >
      <div>
        <p className="text-sm font-medium text-slate-900">{label}</p>
        {description && <p className="text-xs text-slate-500">{description}</p>}
      </div>
      <span
        className={clsx(
          "relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors",
          checked ? "bg-sky-600" : "bg-slate-300",
        )}
      >
        <span
          className={clsx(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform",
            checked ? "translate-x-4" : "translate-x-0.5",
          )}
        />
      </span>
    </button>
  );
}

/** A single-select control (accessible as role="radiogroup") — same job as a row of radio
 *  buttons, styled as pills to match the rest of the app instead of raw circular inputs. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          onClick={() => onChange(option.value)}
          className={clsx(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            option.value === value ? "bg-sky-600 text-white shadow-sm" : "text-slate-600 hover:text-sky-700",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        variant === "primary" && "bg-sky-600 text-white shadow-sm hover:bg-sky-700",
        variant === "secondary" && "bg-white text-slate-900 border border-slate-300 hover:bg-slate-100",
        variant === "danger" && "bg-red-600 text-white hover:bg-red-700",
        className,
      )}
      {...props}
    />
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={clsx(
        "w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30",
        props.className,
      )}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={clsx(
        "w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30",
        props.className,
      )}
    />
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <label className="mb-1 block text-xs font-medium text-slate-600">{children}</label>;
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx("rounded-xl border border-slate-200 bg-white p-4 shadow-sm", className)}>
      {children}
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "green" | "red" | "amber" | "blue" }) {
  const tones: Record<string, string> = {
    neutral: "bg-slate-100 text-slate-700",
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
    amber: "bg-amber-100 text-amber-700",
    blue: "bg-sky-100 text-sky-700",
  };
  return (
    <span className={clsx("inline-block rounded-full px-2 py-0.5 text-xs font-medium", tones[tone])}>
      {children}
    </span>
  );
}

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
      {action}
    </div>
  );
}

/** Shown instead of a page's content when the account lacks the permission that whole page needs. */
export function AccessRestricted({ feature }: { feature: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
      You don&apos;t have access to {feature}. Ask an admin to enable it for your account.
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

export function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
      {message}
    </div>
  );
}

/** For a failed useQuery — distinguishes "couldn't load" from "genuinely empty" or "not found". */
export function QueryError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : "Something went wrong loading this data.";
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
      <p className="mb-3 text-sm text-red-700">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Close">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
