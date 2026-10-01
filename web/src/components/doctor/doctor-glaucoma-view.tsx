"use client";

import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";

import { GlaucomaResultPanel } from "@/components/glaucoma/glaucoma-result-panel";
import { GlaucomaConfirmationForm } from "@/components/doctor/glaucoma-confirmation-form";
import type { GlaucomaResult } from "@/lib/glaucoma";

/** Doctor-facing view of a glaucoma specialist screening -- the glaucoma
 * equivalent of DoctorScreeningView (multi-disease). Same teal-deep,
 * solid-border frame GlaucomaResultPanel already uses everywhere else this
 * model's result appears (not multidisease's dashed/gold "thử nghiệm"
 * language): glaucoma has its own real e2e-validated accuracy
 * (config/glaucoma/config.json), not multidisease's ~62% baseline, so it
 * never needed that lower-confidence framing to begin with. */
export function DoctorGlaucomaView({ result, caseId }: { result: GlaucomaResult; caseId: string }) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2.5 rounded-2xl border border-teal-deep/30 bg-teal/10 px-5 py-3.5 text-sm text-teal-deep">
        <Eye className="h-4 w-4 shrink-0" strokeWidth={1.75} />
        Sàng lọc tăng nhãn áp -- mô hình chuyên biệt, không thay thế đo nhãn áp hay khám chuyên khoa.
      </div>
      <div className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-linear-to-br from-secondary/70 via-background to-background sm:rounded-[2.75rem]">
        <GlaucomaResultPanel
          imageUrl={result.cloudUrl}
          imageAlt="Ảnh đáy mắt đã sàng lọc"
          result={result}
          onReset={() => router.push("/doctor/queue")}
          resetLabel="← Về hàng đợi"
        />
      </div>
      <GlaucomaConfirmationForm aiLabel={result.label} caseId={caseId} />
    </div>
  );
}
