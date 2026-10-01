"use client";

import { useState } from "react";
import Image from "next/image";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { RotateCcw, ZoomIn, ZoomOut } from "lucide-react";

import { cn } from "@/lib/utils";
import { ScopeFrame } from "@/components/scope-frame";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

function ZoomButton({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-ink/5 text-foreground transition-colors hover:bg-ink/10"
    >
      {children}
    </button>
  );
}

/** Wraps a ScopeFrame photo so clicking it opens a full-size zoom/pan view
 * (react-zoom-pan-pinch -- already a dependency, was installed but never
 * actually wired into a component anywhere in the app). The circular
 * aperture is right for "here's the photo" at a glance, but reading fine
 * detail -- microaneurysms, small hemorrhages -- needs more than a 320px
 * circle can show, for a doctor and a curious patient alike.
 *
 * Renders its own trigger (the same ScopeFrame + Image the caller would
 * have rendered directly) plus the dialog -- callers just swap their
 * ScopeFrame for this instead of adding an onClick/useState of their own,
 * since every image display in this app (result panels, case views) wants
 * the exact same behavior. */
export function ImageZoomDialog({
  imageUrl,
  imageAlt,
  size,
  ringColor,
  interiorClassName,
  priority,
  className,
  emptyFallback,
}: {
  imageUrl: string | null | undefined;
  imageAlt: string;
  size?: number;
  ringColor?: string;
  interiorClassName?: string;
  priority?: boolean;
  className?: string;
  /** Shown inside the frame when there's no image to zoom into (e.g. a
   * Cloudinary upload that failed -- Scan.cloudUrl is nullable, see
   * lib/server/cloudinary.ts's fail-open policy). Callers that used to
   * render their own "no photo" icon over a plain ScopeFrame pass it here
   * instead, so that empty state still shows once the trigger becomes
   * non-interactive (disabled, no dialog to open). */
  emptyFallback?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => imageUrl && setOpen(true)}
        disabled={!imageUrl}
        aria-label="Phóng to ảnh đáy mắt"
        className={cn("group relative block disabled:cursor-default", imageUrl && "cursor-zoom-in", className)}
      >
        <ScopeFrame size={size} ringColor={ringColor} interiorClassName={interiorClassName}>
          {imageUrl ? (
            <Image src={imageUrl} alt={imageAlt} fill unoptimized className="object-cover" priority={priority} />
          ) : (
            emptyFallback
          )}
        </ScopeFrame>
        {imageUrl && (
          <span className="absolute inset-[13%] flex items-center justify-center rounded-full bg-ink/0 opacity-0 transition-all duration-200 group-hover:bg-ink/35 group-hover:opacity-100">
            <ZoomIn className="h-6 w-6 text-white" strokeWidth={1.75} />
          </span>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex h-[85vh] w-[92vw] max-w-4xl flex-col gap-3 border border-white/40 bg-white/70 p-3 shadow-2xl backdrop-blur-2xl sm:max-w-4xl">
          <DialogTitle className="sr-only">{imageAlt}</DialogTitle>
          {imageUrl && (
            <TransformWrapper initialScale={1} minScale={1} maxScale={6} centerOnInit doubleClick={{ mode: "toggle" }}>
              {({ zoomIn, zoomOut, resetTransform }) => (
                <>
                  <div className="flex shrink-0 items-center justify-center gap-2">
                    <ZoomButton label="Thu nhỏ" onClick={() => zoomOut()}>
                      <ZoomOut className="h-4 w-4" strokeWidth={1.75} />
                    </ZoomButton>
                    <ZoomButton label="Về kích thước gốc" onClick={() => resetTransform()}>
                      <RotateCcw className="h-4 w-4" strokeWidth={1.75} />
                    </ZoomButton>
                    <ZoomButton label="Phóng to" onClick={() => zoomIn()}>
                      <ZoomIn className="h-4 w-4" strokeWidth={1.75} />
                    </ZoomButton>
                  </div>
                  {/* Fundus photos are typically stored with real black
                      padding baked into the file around the circular capture
                      (camera vignetting) -- against the frosted-glass dialog
                      chrome that reads as a harsh rectangle. A see-through
                      fade over the photo itself was tried and reverted: it
                      can't tell padding apart from real dark clinical
                      content (a hemorrhage, a media opacity can legitimately
                      read as near-black), so it risked fading exactly the
                      detail this dialog exists to show. A plain dark stage
                      behind the image is the safe fix instead -- it never
                      touches the photo's own pixels, and it's the same
                      neutral-dark viewing convention every photo viewer
                      uses for this reason. Only this inner stage is dark;
                      the dialog's own chrome (buttons row, panel edges)
                      stays the frosted white from the rest of the dialog. */}
                  <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl bg-ink">
                    <TransformComponent wrapperClass="!h-full !w-full" contentClass="!flex !h-full !w-full !items-center !justify-center">
                      <div className="relative h-full w-full">
                        <Image src={imageUrl} alt={imageAlt} fill unoptimized className="object-contain" />
                      </div>
                    </TransformComponent>
                  </div>
                </>
              )}
            </TransformWrapper>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
