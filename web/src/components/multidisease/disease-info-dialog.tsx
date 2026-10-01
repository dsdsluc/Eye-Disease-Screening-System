import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScopeFrame } from "@/components/scope-frame";
import { DISEASE_INFO, type DiseaseLabel } from "@/lib/multidisease";
import { DISEASE_EXPLANATIONS } from "@/components/multidisease/disease-explanations";

/** Opened from a ProbabilityGrid tile. Not a reading of the scan -- a "did
 * you know" panel to build general knowledge about the class the reader
 * tapped on. Grid split in two: the uploaded photo (same optical-scope
 * animation as the rest of the app) on one side, short bulleted knowledge
 * on the other -- never one long paragraph.
 *
 * The "Phân tích chuyên sâu" button only appears for the glaucoma tile,
 * regardless of its probability (plans/plan_glaucoma.txt) -- the user's own
 * requirement: the threshold banner on the result panel is a nudge, not a
 * gate, so this dialog must always offer the deep-dive on demand for any
 * class that HAS a specialist model, not only when multidisease's own
 * (single-label) signal happens to be strong. No other class has one yet. */
export function DiseaseInfoDialog({
  label,
  imageUrl,
  imageAlt,
  onOpenChange,
  onAnalyzeGlaucoma,
}: {
  label: DiseaseLabel | null;
  imageUrl?: string | null;
  imageAlt: string;
  onOpenChange: (open: boolean) => void;
  /** Omit to hide the deep-dive button entirely (e.g. contexts where no
   * image is available to re-analyze). */
  onAnalyzeGlaucoma?: () => void;
}) {
  const reduced = useReducedMotion();
  const info = label ? DISEASE_INFO[label] : null;
  const explanation = label ? DISEASE_EXPLANATIONS[label] : null;

  return (
    <Dialog open={label !== null} onOpenChange={onOpenChange}>
      <DialogContent className="glossy shadow-bubble overflow-hidden rounded-3xl border border-border/60 p-0 sm:max-w-3xl">
        {info && explanation && (
          <div className="grid grid-cols-1 sm:grid-cols-[0.85fr_1.15fr]">
            {/* Left: the uploaded photo -- same rotating scope-frame
                signature as login/hero, tinted with this class's own color. */}
            <div className="flex items-center justify-center border-b border-border/60 bg-secondary/40 px-8 py-10 sm:border-r sm:border-b-0">
              <motion.div
                animate={reduced ? undefined : { rotate: 360 }}
                transition={reduced ? undefined : { duration: 60, repeat: Infinity, ease: "linear" }}
              >
                <ScopeFrame size={180} ringColor={info.color} interiorClassName="bg-ink-raised">
                  <motion.div
                    className="relative h-full w-full"
                    animate={reduced ? undefined : { rotate: -360 }}
                    transition={reduced ? undefined : { duration: 60, repeat: Infinity, ease: "linear" }}
                  >
                    {imageUrl && <Image src={imageUrl} alt={imageAlt} fill unoptimized className="object-cover" />}
                  </motion.div>
                </ScopeFrame>
              </motion.div>
            </div>

            {/* Right: the knowledge itself. */}
            <div className="flex flex-col gap-5 px-7 py-8 sm:px-9 sm:py-9">
              <div>
                <p className="font-condensed text-xs uppercase tracking-[0.25em] text-teal-deep">Có thể bạn chưa biết</p>
                <DialogTitle className="mt-1 text-2xl">{info.label}</DialogTitle>
              </div>

              <div className="flex flex-col gap-5">
                {explanation.sections.map((section) => (
                  <div key={section.title}>
                    <p className="font-condensed text-[11px] uppercase tracking-wider text-muted-foreground">{section.title}</p>
                    <ul className="mt-2 flex flex-col gap-2">
                      {section.points.map((point) => (
                        <li key={point} className="flex gap-2.5 text-sm leading-relaxed text-foreground">
                          <span
                            aria-hidden="true"
                            className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: info.color }}
                          />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {label === "glaucoma" && onAnalyzeGlaucoma && (
                <Button
                  onClick={() => {
                    onOpenChange(false);
                    onAnalyzeGlaucoma();
                  }}
                  className="mt-1 self-start"
                >
                  Phân tích chuyên sâu glaucoma
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
