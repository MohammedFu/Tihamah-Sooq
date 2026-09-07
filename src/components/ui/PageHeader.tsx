import type { ReactNode } from "react";

type PageHeaderProps = { title: string; description: string; eyebrow?: string; action?: ReactNode };

export function PageHeader({ title, description, eyebrow = "لوحة إدارة سوق تهامة", action }: PageHeaderProps) {
  return (
    <div className="page-heading">
      <div><p className="eyebrow">{eyebrow}</p><h1 tabIndex={-1}>{title}</h1><p className="muted">{description}</p></div>
      {action}
    </div>
  );
}
