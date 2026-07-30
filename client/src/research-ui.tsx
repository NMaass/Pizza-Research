import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from "react";

export interface ResearchShellProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function ResearchShell({ children, className = "", ...props }: ResearchShellProps) {
  return (
    <div className={`nr-shell ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export interface ResearchHeaderProps {
  title: ReactNode;
  homeHref?: string;
  children?: ReactNode;
  className?: string;
}

export function ResearchHeader({
  title,
  homeHref = "/",
  children,
  className = "",
}: ResearchHeaderProps) {
  return (
    <header className={`nr-header ${className}`.trim()}>
      <a className="nr-brand" href={homeHref}>
        {title}
      </a>
      {children}
    </header>
  );
}

export interface ResearchNavItem {
  id: string;
  label: ReactNode;
}

export interface ResearchNavProps {
  items: ResearchNavItem[];
  activeId: string;
  onChange: (id: string) => void;
  ariaLabel?: string;
}

export function ResearchNav({
  items,
  activeId,
  onChange,
  ariaLabel = "primary navigation",
}: ResearchNavProps) {
  return (
    <nav className="nr-nav" aria-label={ariaLabel}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className="nr-nav-item"
          aria-current={item.id === activeId ? "page" : undefined}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "quiet" | "primary";
}

export function Button({
  variant = "default",
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`nr-button nr-button-${variant} ${className}`.trim()}
      {...props}
    />
  );
}

export function TextInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`nr-input ${className}`.trim()} {...props} />;
}

export interface StatusMessageProps {
  variant?: "info" | "success" | "found" | "error";
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function StatusMessage({
  variant = "info",
  title,
  children,
  action,
  className = "",
}: StatusMessageProps) {
  return (
    <section
      className={`nr-status nr-status-${variant} ${className}`.trim()}
      role={variant === "error" ? "alert" : "status"}
    >
      {title ? <p className="nr-status-title">{title}</p> : null}
      {children ? <div className="nr-status-body">{children}</div> : null}
      {action ? <div className="nr-status-action">{action}</div> : null}
    </section>
  );
}

export interface StackProps extends HTMLAttributes<HTMLDivElement> {
  gap?: "sm" | "md" | "lg";
}

export function Stack({ gap = "md", className = "", ...props }: StackProps) {
  return <div className={`nr-stack nr-stack-${gap} ${className}`.trim()} {...props} />;
}
