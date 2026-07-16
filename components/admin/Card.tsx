import type { ReactNode } from "react";

export default function Card({
  children,
  className = "",
  hover = false,
  as: As = "div",
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  as?: "div" | "section";
}) {
  return (
    <As className={`admin-card ${hover ? "admin-card-hover" : ""} ${className}`}>{children}</As>
  );
}
