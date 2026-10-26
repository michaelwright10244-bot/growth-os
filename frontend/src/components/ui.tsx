import { ReactNode } from "react";

export function Button({ children, variant = "ghost", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "outline" | "ghost" }) {
  return <button {...props} className={`button ${variant} ${props.className ?? ""}`}>{children}</button>;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}

export function SectionTitle({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return <div className="section-title"><div><h2>{title}</h2><p>{text}</p></div>{action}</div>;
}

export function Empty({ text }: { text: string }) { return <p className="empty">{text}</p>; }
export function Label({ label, children }: { label: string; children: ReactNode }) { return <label>{label}{children}</label>; }
