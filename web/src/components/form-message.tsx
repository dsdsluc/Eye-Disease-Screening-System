import { AlertCircle, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";

/** Inline ok/error line for a form submit result -- same icon+color
 * convention (sev-0 green / destructive red) everywhere a form reports back
 * ("Đã lưu.", "Email hoặc mật khẩu không đúng."), instead of each page
 * re-picking the icon and color itself. */
export function FormMessage({
  kind,
  children,
  className,
}: {
  kind: "ok" | "error";
  children: React.ReactNode;
  className?: string;
}) {
  const Icon = kind === "ok" ? CheckCircle2 : AlertCircle;
  return (
    <p className={cn("flex items-center gap-2 text-sm", kind === "ok" ? "text-sev-0" : "text-destructive", className)}>
      <Icon className="h-4 w-4 shrink-0" />
      {children}
    </p>
  );
}
