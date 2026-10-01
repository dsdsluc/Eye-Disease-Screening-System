"use client";

import { useState } from "react";
import { UploadCloud } from "lucide-react";

import { cn } from "@/lib/utils";
import { ScopeFrame } from "@/components/scope-frame";

const DEFAULT_HINT = "hoặc bấm để chọn ảnh đáy mắt — .jpg / .png";

/** Pure drag/drop + file-picker target -- upload orchestration (phase,
 * preview, result) lives in the parent page so it can switch the whole page
 * layout once a result exists (see web/src/app/upload/page.tsx). `hint`
 * defaults to the fundus-photo copy every other screening page here needs
 * (DR/multidisease/glaucoma/AMD) -- /cataract is the one page that needs a
 * different photo entirely (a close-up face/eye shot, not a fundus photo;
 * inference/cataract_engine.py's own docstring: "the first task in this
 * system that does NOT use fundus photos"), so it overrides this prop
 * rather than this component silently saying the wrong thing there. */
export function UploadDropzone({
  onFile,
  disabled,
  hint = DEFAULT_HINT,
}: {
  onFile: (file: File) => void;
  disabled: boolean;
  hint?: string;
}) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <ScopeFrame
      size={340}
      ringColor={dragOver ? "var(--color-gold)" : "var(--color-border)"}
      interiorClassName={cn(
        "bg-linear-to-br from-secondary to-background transition-colors duration-300",
        dragOver && "from-secondary to-secondary"
      )}
    >
      <label
        className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-3 px-8 text-center"
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file) onFile(file);
        }}
      >
        <input
          type="file"
          accept="image/png,image/jpeg"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
            e.target.value = "";
          }}
          disabled={disabled}
        />
        <UploadCloud
          className={cn("h-7 w-7 transition-colors duration-300", dragOver ? "text-gold-deep" : "text-muted-foreground")}
          strokeWidth={1.5}
        />
        <span className="font-condensed text-xs uppercase tracking-[0.25em] text-gold-deep">Thả ảnh vào đây</span>
        <span className="text-sm text-muted-foreground">{hint}</span>
      </label>
    </ScopeFrame>
  );
}
