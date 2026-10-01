"use client";

import { useState } from "react";
import { AlertCircle, Eye, EyeOff, Lock } from "lucide-react";

import { cn } from "@/lib/utils";

/** Labeled password input with a show/hide toggle and a Caps Lock warning --
 * previously copy-pasted into login, register, and account (twice) with
 * the exact same eye-icon/caps-lock logic each time. `icon={false}` drops
 * the leading Lock icon for account's icon-less input style; every other
 * caller keeps it. */
export function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  placeholder,
  minLength,
  required = true,
  icon = true,
  labelExtra,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  placeholder?: string;
  minLength?: number;
  required?: boolean;
  icon?: boolean;
  /** Rendered at the label's trailing edge, e.g. login's "Quên mật khẩu?". */
  labelExtra?: React.ReactNode;
}) {
  const [show, setShow] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </label>
        {labelExtra}
      </div>
      <div className="group relative">
        {icon && (
          <Lock className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-teal-deep" />
        )}
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyUp={(e) => setCapsLockOn(e.getModifierState("CapsLock"))}
          required={required}
          minLength={minLength}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={cn(
            "h-11 w-full rounded-xl border border-border bg-background pr-11 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            icon ? "h-12 pl-10.5" : "pl-3.5"
          )}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          className="absolute top-1/2 right-3.5 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {capsLockOn && (
        <p className="flex items-center gap-1.5 text-xs text-sev-3">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> Phím Caps Lock đang bật
        </p>
      )}
    </div>
  );
}
