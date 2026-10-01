import { Briefcase, CalendarDays, Contact, Droplet, HeartPulse, IdCard, MapPin, Phone, ShieldPlus, UserRound } from "lucide-react";

import { cn } from "@/lib/utils";
import { GENDER_LABEL, ageFrom } from "@/lib/patient";
import { CopyButton } from "@/components/doctor/copy-button";
import { ProfileField } from "@/components/doctor/profile-field";

type PatientProfile = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  nationalId: string | null;
  address: string | null;
  occupation: string | null;
  bloodType: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  medicalHistory: string | null;
  insuranceNumber: string | null;
  createdAt: string;
};

// What counts toward "hồ sơ hoàn thiện" below -- every optional intake field
// on User (schema.prisma), not the always-present account basics
// (fullName/email/createdAt).
const PROFILE_FIELDS = [
  "phone",
  "gender",
  "dateOfBirth",
  "nationalId",
  "address",
  "occupation",
  "bloodType",
  "emergencyContactName",
  "emergencyContactPhone",
  "medicalHistory",
  "insuranceNumber",
] as const;

function emergencyContact(name: string | null, phone: string | null): string | null {
  if (name && phone) return `${name} · ${phone}`;
  return name ?? phone;
}

/** The patient's chart header on app/doctor/patients/[id] -- a hospital-
 * intake-form layout (identity strip up top, then a labeled field grid),
 * the same shape a paper admission form or an ID card uses, not another
 * app-style stat card. Every field here maps to a real column on User
 * (schema.prisma) -- nothing here is computed/derived except age (from
 * dateOfBirth), "Mã bệnh nhân" (a display-only slice of the cuid, not a
 * separate patient-number system), and the completeness count below.
 *
 * A translucent surface (bg-card/85, not opaque) over a soft glow instead
 * of a flat card -- the same "glossy" sheen language used elsewhere, just
 * leaned into further here since this is the one card on the page meant to
 * read as a considered document, not a worklist tile. */
export function PatientProfileCard({ patient }: { patient: PatientProfile }) {
  const age = patient.dateOfBirth ? ageFrom(patient.dateOfBirth) : null;
  const genderLabel = patient.gender ? GENDER_LABEL[patient.gender] : null;
  const dob = patient.dateOfBirth
    ? `${new Date(patient.dateOfBirth).toLocaleDateString("vi-VN")}${age !== null ? ` (${age} tuổi)` : ""}`
    : null;
  const patientCode = patient.id.slice(-8).toUpperCase();

  const filledCount = PROFILE_FIELDS.filter((key) => Boolean(patient[key])).length;
  const complete = filledCount === PROFILE_FIELDS.length;

  return (
    <div className="glossy shadow-bubble relative overflow-hidden rounded-[1.75rem] border border-border/60 bg-card/85">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full opacity-25 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--color-teal) 0%, transparent 70%)" }}
      />

      <div className="relative">
        <div className="flex flex-wrap items-center gap-5 border-b border-border/70 bg-linear-to-br from-secondary/70 via-background/60 to-background/60 px-7 py-6">
          <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground ring-4 ring-card/85">
            <UserRound className="h-9 w-9" strokeWidth={1.5} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-semibold text-foreground">{patient.fullName}</p>
            {patient.email ? (
              <a href={`mailto:${patient.email}`} className="truncate text-sm text-muted-foreground hover:text-teal-deep hover:underline">
                {patient.email}
              </a>
            ) : (
              <p className="truncate text-sm text-muted-foreground/70">Bệnh nhân do bác sĩ nhập -- chưa có tài khoản</p>
            )}
          </div>
          <div className="flex items-start gap-4">
            <span
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 font-condensed text-[9px] font-medium uppercase tracking-wider",
                complete ? "bg-sev-0/15 text-sev-0" : "bg-sev-3/15 text-sev-3"
              )}
            >
              Hồ sơ {filledCount}/{PROFILE_FIELDS.length}
            </span>
            <div className="text-right">
              <p className="font-condensed text-[10px] uppercase tracking-wider text-muted-foreground">Mã bệnh nhân</p>
              <div className="flex items-center gap-1">
                <p className="font-mono text-sm font-semibold text-teal-deep">{patientCode}</p>
                <CopyButton value={patientCode} label="Sao chép mã bệnh nhân" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-x-8 gap-y-5 px-7 py-6 sm:grid-cols-2 lg:grid-cols-3">
          <ProfileField icon={CalendarDays} label="Ngày sinh" value={dob} />
          <ProfileField icon={UserRound} label="Giới tính" value={genderLabel} />
          <ProfileField icon={IdCard} label="Số CCCD/CMND" value={patient.nationalId} />
          <ProfileField icon={Droplet} label="Nhóm máu" value={patient.bloodType} />
          <ProfileField icon={Phone} label="Số điện thoại" value={patient.phone} href={patient.phone ? `tel:${patient.phone}` : undefined} />
          <ProfileField icon={Briefcase} label="Nghề nghiệp" value={patient.occupation} />
          <ProfileField icon={ShieldPlus} label="Bảo hiểm y tế" value={patient.insuranceNumber} />
          <ProfileField
            icon={Contact}
            label="Liên hệ khẩn cấp"
            value={emergencyContact(patient.emergencyContactName, patient.emergencyContactPhone)}
            href={patient.emergencyContactPhone ? `tel:${patient.emergencyContactPhone}` : undefined}
          />
          <ProfileField icon={CalendarDays} label="Tham gia hệ thống" value={new Date(patient.createdAt).toLocaleDateString("vi-VN")} />
        </div>

        <div className="grid grid-cols-1 gap-5 border-t border-border/70 px-7 py-6 sm:grid-cols-2">
          <ProfileField icon={MapPin} label="Địa chỉ thường trú" value={patient.address} className="sm:col-span-2" />
          <ProfileField icon={HeartPulse} label="Tiền sử bệnh / Dị ứng" value={patient.medicalHistory} className="sm:col-span-2" />
        </div>
      </div>
    </div>
  );
}
