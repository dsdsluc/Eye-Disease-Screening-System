"use client";

import { useRouter } from "next/navigation";
import { ScanFace } from "lucide-react";

import { CataractResultPanel } from "@/components/cataract/cataract-result-panel";
import { CataractConfirmationForm } from "@/components/doctor/cataract-confirmation-form";
import type { CataractResult } from "@/lib/cataract";

/** Doctor-facing view of a cataract specialist screening -- the cataract
 * equivalent of DoctorGlaucomaView. sev-1 accent, same color this feature
 * uses everywhere else (OtherModelsNav's cataract badge, CataractResultPanel
 * itself) -- a solid, not dashed, border: unlike multidisease's ~62%
 * baseline, cataract isn't framed as "thử nghiệm" in its own patient-facing
 * copy either (config/cataract/config.json's caveats are handled by never
 * surfacing the training accuracy number, not by a dashed-border warning
 * treatment). */
export function DoctorCataractView({ result, caseId }: { result: CataractResult; caseId: string }) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2.5 rounded-2xl border border-sev-1/30 bg-sev-1/10 px-5 py-3.5 text-sm text-sev-1">
        <ScanFace className="h-4 w-4 shrink-0" strokeWidth={1.75} />
        Sàng lọc đục thủy tinh thể -- ảnh cận mặt/mắt, mô hình chuyên biệt, không thay thế khám chuyên khoa.
      </div>
      <div className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-linear-to-br from-secondary/70 via-background to-background sm:rounded-[2.75rem]">
        <CataractResultPanel
          imageUrl={result.cloudUrl}
          imageAlt="Ảnh đã sàng lọc"
          result={result}
          onReset={() => router.push("/doctor/queue")}
          resetLabel="← Về hàng đợi"
        />
      </div>
      <CataractConfirmationForm aiLabel={result.label} caseId={caseId} />
    </div>
  );
}
