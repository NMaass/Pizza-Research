declare module "@nmaass/research-ui" {
  import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

  export interface TabItem {
    id: string;
    label: ReactNode;
    disabled?: boolean;
  }

  export function ResearchShell(props: HTMLAttributes<HTMLDivElement>): ReactNode;
  export function ResearchHeader(props: {
    title: ReactNode;
    homeHref?: string;
    className?: string;
    children?: ReactNode;
  }): ReactNode;
  export function Tabs(props: {
    items: TabItem[];
    activeId: string;
    onChange: (id: string) => void;
    label?: string;
    className?: string;
  }): ReactNode;
  export function Button(props: ButtonHTMLAttributes<HTMLButtonElement>): ReactNode;
  export function StatusMessage(props: {
    variant?: "info" | "success" | "found" | "error";
    title?: ReactNode;
    action?: ReactNode;
    children?: ReactNode;
    className?: string;
  }): ReactNode;
}

declare module "@nmaass/research-ui/theme.css";
