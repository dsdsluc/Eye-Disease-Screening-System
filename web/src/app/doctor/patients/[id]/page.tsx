import Link from "next/link";
import { notFound } from "next/navigation";
import { Eye, Microscope, ScanFace, Stethoscope } from "lucide-react";

import { prisma } from "@/lib/server/prisma";
import { PatientProfileView } from "@/components/doctor/patient-profile-view";
import { PatientCaseItem } from "@/components/doctor/patient-case-item";
import { PatientScreeningItem } from "@/components/doctor/patient-screening-item";
import { PatientGlaucomaItem } from "@/components/doctor/patient-glaucoma-item";
import { PatientCataractItem } from "@/components/doctor/patient-cataract-item";
import type { DiseaseLabel } from "@/lib/multidisease";

/** Per-patient chart -- a hospital-intake-form-style profile (see
 * PatientProfileCard) plus a history log, deliberately scoped to cases a
 * DOCTOR has actually chốt (Scan.doctorReview / MultidiseaseScreening.
 * screeningReview / GlaucomaScreening.glaucomaReview / CataractScreening.
 * cataractReview all non-null), never a raw AI reading someone hasn't looked
 * at yet. An unreviewed scan is still just a model's guess -- it belongs in
 * Hàng đợi as something to act on, not here as settled history.
 *
 * All four history lists sit in an equal-width two-column grid (wrapping to
 * two rows), not stacked in one column -- same never-equal-confidence
 * separation DR/multi-disease/glaucoma/cataract get everywhere else they'd
 * otherwise sit close together (doctor-case-view.tsx, the queue page's own
 * four sections), just side by side instead of one above the other. Each
 * entry is a small single-row log item (PatientCaseItem / PatientScreeningItem
 * / PatientGlaucomaItem / PatientCataractItem), not a full QueueCard -- this
 * is a settled record to skim, not a worklist to act on. */
export default async function DoctorPatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const patient = await prisma.user.findFirst({ where: { id, role: "patient" } });
  if (!patient) notFound();

  const [reviewedScans, reviewedScreenings, reviewedGlaucomaScreenings, reviewedCataractScreenings] =
    await Promise.all([
      prisma.scan.findMany({
        where: { userId: id, doctorReview: { isNot: null } },
        orderBy: { createdAt: "desc" },
        include: { doctorReview: { include: { doctor: { select: { fullName: true } } } } },
      }),
      prisma.multidiseaseScreening.findMany({
        where: { userId: id, screeningReview: { isNot: null } },
        orderBy: { createdAt: "desc" },
        include: { screeningReview: { include: { doctor: { select: { fullName: true } } } } },
      }),
      prisma.glaucomaScreening.findMany({
        where: { userId: id, glaucomaReview: { isNot: null } },
        orderBy: { createdAt: "desc" },
        include: { glaucomaReview: { include: { doctor: { select: { fullName: true } } } } },
      }),
      prisma.cataractScreening.findMany({
        where: { userId: id, cataractReview: { isNot: null } },
        orderBy: { createdAt: "desc" },
        include: { cataractReview: { include: { doctor: { select: { fullName: true } } } } },
      }),
    ]);

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-border pb-7">
        <div>
          <p className="font-condensed text-xs uppercase tracking-[0.25em] text-teal-deep">Fundas · Bàn khám</p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{patient.fullName}</h1>
        </div>
        <Link
          href="/doctor/patients"
          className="font-condensed text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-teal-deep"
        >
          ← Về danh sách bệnh nhân
        </Link>
      </div>

      <PatientProfileView
        patient={{
          id: patient.id,
          fullName: patient.fullName,
          email: patient.email,
          phone: patient.phone,
          gender: patient.gender,
          dateOfBirth: patient.dateOfBirth ? patient.dateOfBirth.toISOString() : null,
          nationalId: patient.nationalId,
          address: patient.address,
          occupation: patient.occupation,
          bloodType: patient.bloodType,
          emergencyContactName: patient.emergencyContactName,
          emergencyContactPhone: patient.emergencyContactPhone,
          medicalHistory: patient.medicalHistory,
          insuranceNumber: patient.insuranceNumber,
          createdAt: patient.createdAt.toISOString(),
        }}
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <p className="mb-4 flex items-center gap-2 font-condensed text-xs uppercase tracking-[0.2em] text-teal-deep">
            <Stethoscope className="h-3.5 w-3.5" strokeWidth={1.75} />
            Võng mạc tiểu đường -- {reviewedScans.length} ca đã khám
          </p>
          {reviewedScans.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có ca nào được bác sĩ chốt.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {reviewedScans.map((scan) => (
                <PatientCaseItem
                  key={scan.id}
                  scan={{
                    id: scan.id,
                    grade: scan.doctorReview!.doctorGrade,
                    aiGrade: scan.grade,
                    followUp: scan.doctorReview!.followUp,
                    doctorName: scan.doctorReview!.doctor.fullName,
                    reviewedAt: scan.doctorReview!.updatedAt.toISOString(),
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="mb-4 flex items-center gap-2 font-condensed text-xs uppercase tracking-[0.2em] text-gold-deep">
            <Microscope className="h-3.5 w-3.5" strokeWidth={1.75} />
            Đa bệnh (thử nghiệm) -- {reviewedScreenings.length} ca đã khám
          </p>
          {reviewedScreenings.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có lượt sàng lọc nào được bác sĩ chốt.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {reviewedScreenings.map((screening) => (
                <PatientScreeningItem
                  key={screening.id}
                  screening={{
                    id: screening.id,
                    confirmedLabels: screening.screeningReview!.confirmedLabels as DiseaseLabel[],
                    recommendation: screening.screeningReview!.recommendation,
                    doctorName: screening.screeningReview!.doctor.fullName,
                    reviewedAt: screening.screeningReview!.updatedAt.toISOString(),
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="mb-4 flex items-center gap-2 font-condensed text-xs uppercase tracking-[0.2em] text-teal-deep">
            <Eye className="h-3.5 w-3.5" strokeWidth={1.75} />
            Tăng nhãn áp -- {reviewedGlaucomaScreenings.length} ca đã khám
          </p>
          {reviewedGlaucomaScreenings.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có lượt sàng lọc nào được bác sĩ chốt.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {reviewedGlaucomaScreenings.map((screening) => (
                <PatientGlaucomaItem
                  key={screening.id}
                  screening={{
                    id: screening.id,
                    confirmedLabel: screening.glaucomaReview!.confirmedLabel,
                    followUp: screening.glaucomaReview!.followUp,
                    doctorName: screening.glaucomaReview!.doctor.fullName,
                    reviewedAt: screening.glaucomaReview!.updatedAt.toISOString(),
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="mb-4 flex items-center gap-2 font-condensed text-xs uppercase tracking-[0.2em] text-sev-1">
            <ScanFace className="h-3.5 w-3.5" strokeWidth={1.75} />
            Đục thủy tinh thể -- {reviewedCataractScreenings.length} ca đã khám
          </p>
          {reviewedCataractScreenings.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa có lượt sàng lọc nào được bác sĩ chốt.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {reviewedCataractScreenings.map((screening) => (
                <PatientCataractItem
                  key={screening.id}
                  screening={{
                    id: screening.id,
                    confirmedLabel: screening.cataractReview!.confirmedLabel,
                    followUp: screening.cataractReview!.followUp,
                    doctorName: screening.cataractReview!.doctor.fullName,
                    reviewedAt: screening.cataractReview!.updatedAt.toISOString(),
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
