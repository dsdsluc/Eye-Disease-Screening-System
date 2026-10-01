"use client";

import { Toast } from "@base-ui/react/toast";

const { createToastManager } = Toast;

/** App-wide toast manager, created once at module scope (Base UI's escape
 * hatch for using toasts from outside a React component -- see
 * ToastProvider's own `toastManager` prop, wired up in
 * components/ui/toast.tsx's <Toaster/>). This is what makes notifyError
 * callable from a page's plain `catch (e) {}` block without needing
 * useToastManager()'s hook-in-a-component restriction.
 *
 * Scope note: this fixes the "Inference service trả lỗi (422)" complaint at
 * the delivery layer (a real, dismissible notification instead of text
 * buried inside whichever dialog happened to be open) -- lib/server/
 * inference-client.ts's own message-content fix (parsing FastAPI's `detail`
 * body instead of dropping it) is what makes the MESSAGE itself meaningful.
 * Both were broken; this file only owns the first half. */
export const toastManager = createToastManager();

const DEFAULT_ERROR_TITLE = "Có lỗi xảy ra";

export function notifyError(message: string, title: string = DEFAULT_ERROR_TITLE) {
  toastManager.add({ type: "error", title, description: message, timeout: 7000 });
}

export function notifySuccess(message: string, title?: string) {
  toastManager.add({ type: "success", title, description: message, timeout: 4000 });
}
