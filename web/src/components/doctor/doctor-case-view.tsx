"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { GRADE_COLORS, GRADE_EXPLANATIONS } from "@/lib/api";
import { DISEASE_INFO, type DiseaseLabel } from "@/lib/multidisease";
import { ScanResultPanel } from "@/components/scan-result-panel";
import { DoctorConfirmationForm } from "@/components/doctor/doctor-confirmation-form";

type CaseScan = {
  id: string;
  cloudUrl: string | null;
  grade: number;
  backboneScores: Record<string, number>;
  qualityLabel: string | null;
};

type LinkedScreening = {
  id: string;
  topLabel: string;
  topProb: number;
  createdAt: string;
  reviewed: boolean;
};

/** The interactive half of /doctor/case/[id] -- the page itself is a Server
 * Component that fetches the Scan (and any MultidiseaseScreening rows
 * linked to it via scanId, see /api/multidisease's scan-reuse path); this
 * client-side wrapper just owns the "Chi tiết kỹ thuật" toggle
 * ScanResultPanel needs and renders the two sections a doctor view adds on
 * top of the patient-facing panel. */
export function DoctorCaseView({ scan, linkedScreenings }: { scan: CaseScan; linkedScreenings: LinkedScreening[] }) {
  const [showTechnical, setShowTechnical] = useState(false);
  const gradeColor = GRADE_COLORS[scan.grade];

  return (
    <div className="flex flex-col gap-8">
      <div className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-linear-to-br from-secondary/70 via-background to-background sm:rounded-[2.75rem]">
        <ScanResultPanel
          imageUrl={scan.cloudUrl}
          imageAlt="Ảnh đáy mắt của bệnh nhân"
          imagePriority
          gradeColor={gradeColor}
          grade={scan.grade}
          explanation={GRADE_EXPLANATIONS[scan.grade]}
          backboneScores={scan.backboneScores}
          qualityWarning={
            scan.qualityLabel && scan.qualityLabel !== "good"
              ? {
                  title: "Chất lượng ảnh chưa đạt",
                  body: "Cân nhắc yêu cầu chụp lại trước khi đưa kết luận cuối cùng dựa trên ảnh này.",
                  variant: scan.qualityLabel === "reject" ? "destructive" : "default",
                }
              : null
          }
          showTechnical={showTechnical}
          onToggleTechnical={() => setShowTechnical((v) => !v)}
        />
      </div>

      {/* Multi-disease screenings linked to THIS scan (via scanId -- the
          "Sàng lọc thêm các bệnh khác" button on the patient-facing
          /results/[imageId]) -- its own section, never merged into the DR
          card above, per plans/plan_multidisease.txt section 4.4's explicit
          instruction that a doctor view keep this in a separate tab/section
          so it never reads as equivalent-confidence to the DR grade. Each
          row is its own clickable link into /doctor/screening/[id] -- a
          linked screening is a full review item in its own right now (it
          also gets its own card in Hàng đợi, queue/page.tsx), not just a
          read-only mention here. */}
      {linkedScreenings.length > 0 && (
        <div>
          <p className="mb-4 font-condensed text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Sàng lọc đa bệnh (thử nghiệm) trên cùng ảnh này
          </p>
          <div className="flex flex-col gap-3">
            {linkedScreenings.map((screening) => {
              const info = DISEASE_INFO[screening.topLabel as DiseaseLabel];
              return (
                <Link
                  key={screening.id}
                  href={`/doctor/screening/${screening.id}`}
                  className="group flex items-center justify-between gap-4 rounded-2xl border border-dashed border-border/70 bg-card/60 px-5 py-4 transition-colors hover:bg-secondary/40"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold" style={{ color: info.color }}>
                      {info.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(screening.createdAt).toLocaleDateString("vi-VN")}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-mono text-sm text-muted-foreground">{(screening.topProb * 100).toFixed(1)}%</span>
                    <span
                      className={cn(
                        "flex items-center gap-1 rounded-full px-2.5 py-1 font-condensed text-[9px] font-medium uppercase tracking-wider",
                        screening.reviewed ? "bg-sev-0/15 text-sev-0" : "bg-sev-3/15 text-sev-3"
                      )}
                    >
                      {screening.reviewed && <CheckCircle2 className="h-3 w-3" strokeWidth={1.75} />}
                      {screening.reviewed ? "Đã xử lý" : "Chưa xử lý"}
                    </span>
                    <ArrowRight
                      className="h-3.5 w-3.5 -translate-x-1 text-muted-foreground opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
                      strokeWidth={1.75}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <DoctorConfirmationForm aiGrade={scan.grade} caseId={scan.id} />
    </div>
  );
}
