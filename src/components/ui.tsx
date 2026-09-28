import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react"

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger"
  children: ReactNode
}

export function Button({ variant = "secondary", className = "", children, ...props }: ButtonProps) {
  return <button className={`btn btn-${variant} ${className}`} {...props}>{children}</button>
}

export function IconButton({ children, label, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; label: string }) {
  return <button className={`icon-btn ${className}`} aria-label={label} title={label} {...props}>{children}</button>
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "critical" | "warning" | "success" | "info" | "neutral" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className="input" {...props} />
}

export function PageTitle({ children }: { children: ReactNode }) {
  return <div className="page-title" role="heading" aria-level={1}>{children}</div>
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <div className="section-title" role="heading" aria-level={2}>{children}</div>
}

export function Eyebrow({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "info" | "success" | "warning" }) {
  return <div className={`eyebrow eyebrow-${tone}`}>{children}</div>
}
