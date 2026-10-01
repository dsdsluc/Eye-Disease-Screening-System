"use client"

import * as React from "react"
import { Toast as ToastPrimitive } from "@base-ui/react/toast"
import { AlertTriangle, CheckCircle2, XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { toastManager } from "@/lib/toast"

function ToastProvider({ ...props }: ToastPrimitive.Provider.Props) {
  return <ToastPrimitive.Provider data-slot="toast-provider" toastManager={toastManager} {...props} />
}

function ToastPortal({ ...props }: ToastPrimitive.Portal.Props) {
  return <ToastPrimitive.Portal data-slot="toast-portal" {...props} />
}

function ToastViewport({ className, ...props }: ToastPrimitive.Viewport.Props) {
  return (
    <ToastPrimitive.Viewport
      data-slot="toast-viewport"
      className={cn(
        "fixed inset-x-4 bottom-4 z-100 mx-auto flex w-full max-w-sm flex-col-reverse gap-2.5 outline-none sm:right-4 sm:left-auto sm:mx-0",
        className
      )}
      {...props}
    />
  )
}

const TYPE_ACCENT: Record<string, string> = {
  error: "border-l-sev-4",
  success: "border-l-sev-0",
}

const TYPE_ICON: Record<string, React.ReactNode> = {
  error: <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-sev-4" strokeWidth={1.75} />,
  success: <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-sev-0" strokeWidth={1.75} />,
}

function ToastRoot({ toast, className, ...props }: ToastPrimitive.Root.Props) {
  const accent = (toast.type && TYPE_ACCENT[toast.type]) || "border-l-border";
  const icon = toast.type ? TYPE_ICON[toast.type] : null;

  return (
    <ToastPrimitive.Root
      data-slot="toast"
      toast={toast}
      className={cn(
        "glossy shadow-bubble relative grid grid-cols-[auto_1fr] items-start gap-3 rounded-2xl border border-border/60 border-l-4 bg-card/95 py-3.5 pr-9 pl-4 backdrop-blur-xl transition-all duration-300",
        "translate-x-[var(--toast-swipe-movement-x,0px)] translate-y-[var(--toast-swipe-movement-y,0px)]",
        "data-starting-style:translate-y-2 data-starting-style:opacity-0 data-ending-style:opacity-0",
        accent,
        className
      )}
      {...props}
    >
      {icon}
      <div className="min-w-0">
        {toast.title && <ToastPrimitive.Title data-slot="toast-title" className="text-sm font-semibold text-foreground" />}
        {toast.description && (
          <ToastPrimitive.Description
            data-slot="toast-description"
            className="mt-0.5 text-sm leading-snug text-muted-foreground"
          />
        )}
      </div>
      <ToastPrimitive.Close
        data-slot="toast-close"
        render={<Button variant="ghost" size="icon-xs" className="absolute top-2.5 right-2.5" />}
      >
        <XIcon />
        <span className="sr-only">Đóng thông báo</span>
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  )
}

function ToastList() {
  const { toasts } = ToastPrimitive.useToastManager()
  return toasts.map((toast) => <ToastRoot key={toast.id} toast={toast} />)
}

/** Mounted once, at the root layout -- app-wide notification surface for
 * anything that isn't already handled by a contextual, in-place UI (a
 * dialog's own error state, a form's own inline message). First real use:
 * lib/toast.ts's notifyError, called from each screening page's existing
 * `catch (e) {}` block alongside its own dialog error state, so a failed
 * inference call (previously just an opaque "Inference service trả lỗi
 * (422)" buried in whichever dialog happened to be open) also surfaces as
 * a real, dismissible notification. */
export function Toaster() {
  return (
    <ToastProvider>
      <ToastPortal>
        <ToastViewport>
          <ToastList />
        </ToastViewport>
      </ToastPortal>
    </ToastProvider>
  )
}
