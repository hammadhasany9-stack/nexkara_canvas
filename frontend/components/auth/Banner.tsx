import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Banner({
  kind,
  children,
}: {
  kind: "error" | "info";
  children: React.ReactNode;
}) {
  if (!children) return null;
  const isError = kind === "error";
  return (
    <div
      role={isError ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-input border px-3.5 py-2.5 text-sm",
        isError
          ? "border-danger/30 bg-danger/10 text-danger"
          : "border-brand-600/30 bg-brand-50 text-brand-700",
      )}
    >
      {isError ? (
        <AlertCircle size={16} className="mt-0.5 shrink-0" />
      ) : (
        <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
      )}
      <span>{children}</span>
    </div>
  );
}
