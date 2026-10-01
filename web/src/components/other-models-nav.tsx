"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Eye, Microscope, ScanEye, ScanFace, UploadCloud, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type ModelKey = "dr" | "multidisease" | "glaucoma" | "amd" | "cataract";

const MODELS: Record<ModelKey, { href: string; label: string; icon: LucideIcon; badgeClass: string; isNew?: boolean }> = {
  dr: { href: "/upload", label: "Sàng lọc võng mạc", icon: UploadCloud, badgeClass: "bg-teal/10 text-teal-deep" },
  multidisease: {
    href: "/multidisease",
    label: "Sàng lọc đa bệnh",
    icon: Microscope,
    badgeClass: "bg-gold/10 text-gold-deep",
  },
  glaucoma: {
    href: "/glaucoma",
    label: "Sàng lọc tăng nhãn áp",
    icon: Eye,
    badgeClass: "bg-maroon/10 text-maroon-deep",
  },
  amd: {
    href: "/amd",
    label: "Sàng lọc thoái hóa điểm vàng",
    icon: ScanEye,
    badgeClass: "bg-sev-3/10 text-sev-3",
  },
  cataract: {
    href: "/cataract",
    label: "Sàng lọc đục thủy tinh thể",
    icon: ScanFace,
    badgeClass: "bg-sev-1/10 text-sev-1",
    // The genuinely newest of the five (this component's isNew dot moved
    // here from AMD once cataract got its own standalone page) -- a real
    // "chỉ mới có" signal for a returning visitor, not decoration added for
    // its own sake. Move it again once cataract stops being the newest
    // thing here.
    isNew: true,
  },
};

/** Small, quiet nav for /upload, /multidisease, /glaucoma, /amd, and
 * /cataract's ANONYMOUS view only -- a logged-in visitor already has
 * AppNavCard (components/app-nav-card.tsx) for this; a guest landing
 * directly on one of these screening pages had no way to discover the
 * others except going back to the home page first.
 *
 * A horizontal pill row meant to sit in the same header line as that page's
 * "← Trang chủ" link -- NOT a previous version's `absolute right-full`
 * standing card in the left margin, which only ever fit at exactly the
 * 2xl breakpoint's margin width and clipped off-screen the moment a label
 * (or a viewer's actual margin, zoom level, etc.) needed more room than
 * that. A row inside normal document flow can't run off the edge of the
 * viewport at any width, so it's shown from the smallest breakpoint up
 * instead of hidden below 2xl. Shows the OTHER models (never the one you're
 * already on), each keeping its own badge color from elsewhere in the app --
 * DR stays teal-deep (the flagship accent), multi-disease stays gold-deep
 * (ServicesSection, its own page's tip icons), glaucoma stays maroon-deep,
 * AMD gets sev-3 (the same orange DISEASE_INFO.amd and the homepage's
 * eye-conditions card already use for it), cataract gets sev-1 -- a fifth
 * distinct color (not DISEASE_INFO.cataract's gold-deep, which multidisease
 * already claims here) so no two tiles ever look the same. */
export function OtherModelsNav({ current, className }: { current: ModelKey; className?: string }) {
  const others = (Object.keys(MODELS) as ModelKey[]).filter((key) => key !== current);

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={cn("flex flex-wrap items-center gap-2", className)}
    >
      <span className="hidden font-condensed text-[9px] uppercase tracking-wider text-muted-foreground/80 sm:inline">
        Khám phá thêm
      </span>
      {others.map((key) => {
        const model = MODELS[key];
        return (
          <Link
            key={key}
            href={model.href}
            className="glossy flex shrink-0 items-center gap-2 rounded-full border border-border/50 bg-card/60 py-1.5 pr-3.5 pl-1.5 backdrop-blur-md transition-colors hover:bg-secondary/60"
          >
            <span className={`relative flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full ${model.badgeClass}`}>
              <model.icon className="h-3 w-3" strokeWidth={1.75} />
              {model.isNew && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-sev-0 ring-2 ring-card">
                  <span className="sr-only">Tính năng mới</span>
                </span>
              )}
            </span>
            <span className="text-xs font-medium whitespace-nowrap text-foreground">{model.label}</span>
          </Link>
        );
      })}
    </motion.div>
  );
}
