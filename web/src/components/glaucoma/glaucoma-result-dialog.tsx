import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ScopeFrame } from "@/components/scope-frame";
import { DISEASE_INFO } from "@/lib/multidisease";
import type { GlaucomaResult } from "@/lib/glaucoma";

/** Shown after the glaucoma deep-dive finishes (plans/plan_glaucoma.txt) --
 * triggered from either MultidiseaseResultPanel's threshold banner or the
 * "Phân tích chuyên sâu" button inside DiseaseInfoDialog's glaucoma tile.
 * Deliberately its own dialog, not a variant of DiseaseInfoDialog: that one
 * is general "did you know" education, this one is an actual model result
 * with its own probability and its own, sharper disclaimer -- the auto-crop
 * step this model depends on (plans/plan_glaucoma.txt section 2.1) is a
 * heuristic approximation, not a calibrated measurement, so the caveat here
 * has to say more than "chỉ mang tính tham khảo" alone would. */
export function GlaucomaResultDialog({
  result,
  imageUrl,
  imageAlt,
  onOpenChange,
}: {
  result: GlaucomaResult | null;
  imageUrl?: string | null;
  imageAlt: string;
  onOpenChange: (open: boolean) => void;
}) {
  const reduced = useReducedMotion();
  const isGlaucoma = result?.label === "glaucoma";
  const color = isGlaucoma ? DISEASE_INFO.glaucoma.color : "var(--color-sev-0)";

  return (
    <Dialog open={result !== null} onOpenChange={onOpenChange}>
      <DialogContent className="glossy shadow-bubble overflow-hidden rounded-3xl border border-border/60 p-0 sm:max-w-lg">
        {result && (
          <div className="flex flex-col items-center gap-6 px-7 py-9 text-center sm:px-9">
            <p className="font-condensed text-xs uppercase tracking-[0.25em] text-teal-deep">
              Fundas · Phân tích chuyên sâu
            </p>

            <motion.div
              animate={reduced ? undefined : { rotate: 360 }}
              transition={reduced ? undefined : { duration: 60, repeat: Infinity, ease: "linear" }}
            >
              <ScopeFrame size={150} ringColor={color} interiorClassName="bg-ink-raised">
                <motion.div
                  className="relative h-full w-full"
                  animate={reduced ? undefined : { rotate: -360 }}
                  transition={reduced ? undefined : { duration: 60, repeat: Infinity, ease: "linear" }}
                >
                  {imageUrl && <Image src={imageUrl} alt={imageAlt} fill unoptimized className="object-cover" />}
                </motion.div>
              </ScopeFrame>
            </motion.div>

            <div>
              <DialogTitle className="text-2xl" style={{ color }}>
                {isGlaucoma ? "Nghi ngờ tăng nhãn áp" : "Không phát hiện dấu hiệu rõ rệt"}
              </DialogTitle>
              <p className="mt-1 font-mono text-sm text-muted-foreground">
                {(result.probGlaucoma * 100).toFixed(1)}% xác suất glaucoma
              </p>
            </div>

            {/* Same copy as GlaucomaResultPanel (components/glaucoma/
                glaucoma-result-panel.tsx) -- kept in sync so the two places
                this model's result appears never say two different things
                about it. Rewritten from an earlier, more defensive draft
                (led with the internal auto-crop step and a bare accuracy
                number compared unfavorably to DR) -- still honest that this
                is a screening aid, not a diagnosis, but reads like a
                considered product decision rather than a disclaimer bolted
                on afterward. */}
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              Kết quả dựa trên mô hình AI chuyên biệt cho tăng nhãn áp, phân tích trực tiếp trên ảnh bạn vừa tải lên.
              Đây là <strong className="text-foreground">bước sàng lọc ban đầu</strong>, mang tính tham khảo --{" "}
              <strong className="text-foreground">không thay thế</strong> việc đo nhãn áp hoặc khám chuyên khoa mắt để
              có chẩn đoán chính xác.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
