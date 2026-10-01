"use client";

import { useRouter } from "next/navigation";
import { Microscope } from "lucide-react";

import { MultidiseaseResultPanel } from "@/components/multidisease/result-panel";
import { ScreeningConfirmationForm } from "@/components/doctor/screening-confirmation-form";
import type { MultiDiseaseResult } from "@/lib/multidisease";

/** Doctor-facing view of a STANDALONE multi-disease screening (no linked
 * Scan -- one tied to a Scan already shows on that scan's own /doctor/case
 * page instead, see queue/page.tsx). The dashed, gold-toned frame and the
 * banner below are the same "don't imply DR-level confidence" language used
 * everywhere else this feature appears -- this model is explicitly
 * experimental (~62% val accuracy, plans/plan_multidisease.txt section 6),
 * and ScreeningConfirmationForm below is its own shape (multi-select over 8
 * labels, no 0-4 grade) precisely so it never reads as the same kind of
 * authoritative sign-off as DoctorConfirmationForm on the DR side. */
export function DoctorScreeningView({ result, caseId }: { result: MultiDiseaseResult; caseId: string }) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2.5 rounded-2xl border border-dashed border-gold-deep/40 bg-gold/10 px-5 py-3.5 text-sm text-gold-deep">
        <Microscope className="h-4 w-4 shrink-0" strokeWidth={1.75} />
        Sàng lọc đa bệnh (thử nghiệm) -- chỉ mang tính tham khảo, không thay thế chẩn đoán lâm sàng.
      </div>
      <div className="relative overflow-hidden rounded-[2rem] border border-dashed border-border/70 bg-linear-to-br from-secondary/70 via-background to-background sm:rounded-[2.75rem]">
        <MultidiseaseResultPanel
          imageUrl={result.cloudUrl}
          imageAlt="Ảnh đáy mắt đã sàng lọc"
          result={result}
          onReset={() => router.push("/doctor/queue")}
          resetLabel="← Về hàng đợi"
        />
      </div>
      <ScreeningConfirmationForm topLabel={result.topLabel} caseId={caseId} />
    </div>
  );
}
