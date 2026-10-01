"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Microscope, Phone, UserRound } from "lucide-react";

import { GENDER_LABEL, ageFrom } from "@/lib/patient";

type Patient = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  createdAt: string;
  scanCount: number;
  screeningCount: number;
  lastActivityAt: string | null;
};

/** One patient in /doctor/patients -- same bigger exam-plate shape as
 * QueueCard, but the content is about the PATIENT (who they are, how to
 * reach them), not their latest case -- that's what a plain default avatar
 * is for here instead of a scan thumbnail: this list answers "who is this
 * person," Hàng đợi already answers "what did their scan show." Clicking
 * the card goes to their chart (app/doctor/patients/[id]) -- personal info
 * plus every case a doctor has actually reviewed, never a raw unreviewed
 * AI reading. */
export function PatientCard({ patient, index }: { patient: Patient; index: number }) {
  const age = patient.dateOfBirth ? ageFrom(patient.dateOfBirth) : null;
  const genderLabel = patient.gender ? GENDER_LABEL[patient.gender] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.3), ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="group relative grid grid-cols-[auto_1fr] items-start gap-6 rounded-2xl border border-border/60 bg-card p-6 transition-colors hover:bg-secondary/40">
        {/* Same sibling-Link-behind-content pattern as QueueCard --
            everything above is pointer-events-none so a click anywhere
            falls through to this Link. No interactive element re-enabled
            on top of it here (no photo to zoom into), so it's simpler than
            QueueCard's version. */}
        <Link
          href={`/doctor/patients/${patient.id}`}
          aria-label={`Xem hồ sơ của ${patient.fullName}`}
          className="absolute inset-0 z-0 rounded-2xl"
        />

        {/* Default avatar -- patients have no profile photo (schema.prisma
            has no field for one), and a scan thumbnail here would conflate
            "this patient" with "their latest case," which is Hàng đợi's job
            instead. */}
        <span className="relative z-10 flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
          <UserRound className="h-7 w-7" strokeWidth={1.5} />
        </span>

        <div className="relative z-10 pointer-events-none min-w-0 text-left">
          <p className="truncate text-base font-semibold text-foreground">{patient.fullName}</p>
          <p className="truncate text-sm text-muted-foreground">{patient.email ?? "Chưa có tài khoản"}</p>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {patient.phone && (
              <span className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" strokeWidth={1.75} />
                {patient.phone}
              </span>
            )}
            {(age !== null || genderLabel) && (
              <span>
                {genderLabel}
                {genderLabel && age !== null && " · "}
                {age !== null && `${age} tuổi`}
              </span>
            )}
            <span>Tham gia {new Date(patient.createdAt).toLocaleDateString("vi-VN")}</span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
            <span className="text-foreground">
              <span className="font-mono font-semibold">{patient.scanCount}</span>{" "}
              <span className="text-muted-foreground">lượt sàng lọc võng mạc</span>
            </span>
            <span className="flex items-center gap-1.5 text-foreground">
              <Microscope className="h-3.5 w-3.5 text-gold-deep" strokeWidth={1.75} />
              <span className="font-mono font-semibold">{patient.screeningCount}</span>{" "}
              <span className="text-muted-foreground">lượt đa bệnh</span>
            </span>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            {patient.lastActivityAt
              ? `Hoạt động gần nhất: ${new Date(patient.lastActivityAt).toLocaleString("vi-VN")}`
              : "Chưa có lượt sàng lọc nào."}
          </p>
        </div>

        <ArrowRight
          className="pointer-events-none absolute top-6 right-6 z-10 h-4 w-4 -translate-x-1 text-muted-foreground opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
          strokeWidth={1.75}
        />
      </div>
    </motion.div>
  );
}
