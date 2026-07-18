import type { ButtonHTMLAttributes, ReactNode } from "react";

interface AccessibleActionProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

export function AccessibleAction({ children, className = "", type = "button", ...props }: AccessibleActionProps) {
  return (
    <button type={type} className={`nr-button ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
