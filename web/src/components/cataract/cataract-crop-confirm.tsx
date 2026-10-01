"use client";

import { AlertTriangle, Check, RefreshCcw } from "lucide-react";

import { ScopeFrame } from "@/components/scope-frame";

/** Confirm-before-classify screen (plans/archetechture.txt) -- shows the
 * EXACT crop /cataract-crop-preview produced (a base64 PNG, hence a plain
 * <img> here rather than next/image: a data: URI src doesn't need Next's
 * remote-image optimizer, and `unoptimized` alone doesn't guarantee that
 * protocol is accepted as `src` across versions) and lets the user approve
 * it or go back and retake/reselect, BEFORE app/cataract/page.tsx ever
 * calls analyzeCataract(). Sits between the capture step (UploadDropzone/
 * CameraCapture) and the result panel in that page's own view switch.
 */
export function CataractCropConfirm({
  croppedPng,
  eyeCropApplied,
  onConfirm,
  onRetake,
}: {
  croppedPng: string;
  eyeCropApplied: boolean;
  onConfirm: () => void;
  onRetake: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-6 px-6 py-10 sm:px-10">
      <p className="font-condensed text-xs uppercase tracking-[0.3em] text-teal-deep">
        Xác nhận vùng mắt trước khi phân tích
      </p>

      <ScopeFrame size={300} interiorClassName="bg-ink-raised">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={croppedPng} alt="Vùng mắt đã khoanh tự động" className="h-full w-full object-cover" />
      </ScopeFrame>

      {eyeCropApplied ? (
        <p className="max-w-sm text-center text-sm text-muted-foreground">
          Đây là vùng mắt mô hình đã tự động khoanh ra từ ảnh của bạn. Đúng chưa?
        </p>
      ) : (
        <div className="flex max-w-sm items-start gap-2.5 rounded-xl border border-sev-3/40 bg-sev-3/10 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-sev-3" strokeWidth={1.75} />
          <p className="text-left text-xs leading-snug text-muted-foreground">
            Không phát hiện được khuôn mặt -- mô hình sẽ phân tích trên nguyên ảnh này thay vì vùng mắt được khoanh
            riêng. Nếu ảnh chưa cận vào mắt, hãy chụp/chọn lại để có kết quả chính xác hơn.
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onRetake}
          className="glossy shadow-bubble flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 font-condensed text-xs uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
        >
          <RefreshCcw className="h-3.5 w-3.5" strokeWidth={1.75} />
          Chụp/chọn lại
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="glossy shadow-bubble flex items-center gap-2 rounded-full border border-gold-deep bg-gold-deep px-6 py-2.5 font-condensed text-xs uppercase tracking-[0.2em] text-white transition-transform active:scale-95"
        >
          <Check className="h-3.5 w-3.5" strokeWidth={2} />
          Đúng rồi, phân tích
        </button>
      </div>
    </div>
  );
}
