import Image from "next/image";
import { Award, Briefcase, CalendarDays, GraduationCap, Mail, Phone, Quote, UserRound } from "lucide-react";

export type DoctorProfile = {
  fullName: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  specialty: string | null;
  licenseNumber: string | null;
  hospital: string | null;
  yearsOfExperience: number | null;
  education: string | null;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: string;
};

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2.5 text-sm font-semibold tracking-wide text-foreground uppercase">
      <span className="h-4 w-1 shrink-0 rounded-full bg-gold-deep" />
      {children}
    </h2>
  );
}

/** "Hồ sơ bác sĩ" (app/doctor/profile) -- an actual two-column CV/resume
 * layout (photo + identity + contact in a colored sidebar, credentials/
 * education/bio in the main panel), not a labeled-field grid like
 * PatientProfileCard's hospital-intake-form look (patient-profile-card.tsx)
 * -- the two are deliberately built on different shapes so a doctor's own
 * profile never reads as "the same card, different data" next to a
 * patient's chart. The sidebar's maroon-to-gold gradient is the same pair
 * DoctorHeader already uses for its own avatar badge (components/doctor/
 * doctor-header.tsx) -- this page's version of that same "doctor" identity
 * color, not a new one invented here. */
export function DoctorProfileCard({ doctor }: { doctor: DoctorProfile }) {
  const displayName = doctor.title ? `${doctor.title} ${doctor.fullName}` : doctor.fullName;
  const educationLines = doctor.education?.split("\n").filter(Boolean) ?? [];

  return (
    <div className="glossy shadow-bubble grid overflow-hidden rounded-[1.75rem] border border-border/60 lg:grid-cols-[300px_1fr]">
      {/* Sidebar -- identity, contact, and the one headline stat (years of
          experience), the way a resume's own sidebar column works. */}
      <div className="relative flex flex-col items-center gap-6 overflow-hidden bg-linear-to-br from-maroon-deep to-gold-deep/90 px-8 py-10 text-center text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 -left-16 h-56 w-56 rounded-full bg-white/5 blur-3xl"
        />
        <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-full ring-4 ring-white/30">
          {doctor.avatarUrl ? (
            <Image src={doctor.avatarUrl} alt={displayName} fill unoptimized className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-white/10">
              <UserRound className="h-12 w-12 text-white/80" strokeWidth={1.5} />
            </div>
          )}
        </div>

        <div className="relative">
          <p className="text-xl leading-snug font-bold text-white">{displayName}</p>
          {doctor.specialty && (
            <span className="mt-2.5 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-medium tracking-wide text-white uppercase">
              {doctor.specialty}
            </span>
          )}
        </div>

        {doctor.yearsOfExperience !== null && (
          <div className="relative flex flex-col items-center border-t border-white/25 pt-6">
            <span className="font-mono text-4xl font-bold text-white">{doctor.yearsOfExperience}</span>
            <span className="text-xs tracking-wide text-white/80 uppercase">năm kinh nghiệm</span>
          </div>
        )}

        <div className="relative flex w-full flex-col gap-3 border-t border-white/25 pt-6 text-left">
          {doctor.phone && (
            <a href={`tel:${doctor.phone}`} className="flex items-center gap-2.5 text-sm text-white/90 hover:text-white">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15">
                <Phone className="h-3.5 w-3.5" strokeWidth={1.75} />
              </span>
              <span className="truncate">{doctor.phone}</span>
            </a>
          )}
          {doctor.email && (
            <a href={`mailto:${doctor.email}`} className="flex items-center gap-2.5 text-sm text-white/90 hover:text-white">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15">
                <Mail className="h-3.5 w-3.5" strokeWidth={1.75} />
              </span>
              <span className="truncate">{doctor.email}</span>
            </a>
          )}
          {doctor.hospital && (
            <div className="flex items-center gap-2.5 text-sm text-white/90">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15">
                <Briefcase className="h-3.5 w-3.5" strokeWidth={1.75} />
              </span>
              <span className="truncate">{doctor.hospital}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main panel -- credentials, education, bio, generously spaced so it
          reads as a document, not a cramped stat card. */}
      <div className="flex flex-col gap-9 bg-card px-8 py-10 sm:px-10">
        <div>
          <SectionHeading>Thông tin hành nghề</SectionHeading>
          <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div>
              <p className="flex items-center gap-1.5 font-condensed text-[10px] tracking-wider text-muted-foreground uppercase">
                <Award className="h-3.5 w-3.5 text-teal-deep" strokeWidth={1.75} />
                Số chứng chỉ hành nghề
              </p>
              <p className="mt-1.5 text-sm font-semibold text-foreground">
                {doctor.licenseNumber || <span className="font-normal text-muted-foreground/70">Chưa cập nhật</span>}
              </p>
            </div>
            <div>
              <p className="flex items-center gap-1.5 font-condensed text-[10px] tracking-wider text-muted-foreground uppercase">
                <Briefcase className="h-3.5 w-3.5 text-maroon-deep" strokeWidth={1.75} />
                Nơi công tác
              </p>
              <p className="mt-1.5 text-sm font-semibold text-foreground">
                {doctor.hospital || <span className="font-normal text-muted-foreground/70">Chưa cập nhật</span>}
              </p>
            </div>
            <div>
              <p className="flex items-center gap-1.5 font-condensed text-[10px] tracking-wider text-muted-foreground uppercase">
                <CalendarDays className="h-3.5 w-3.5 text-gold-deep" strokeWidth={1.75} />
                Tham gia hệ thống
              </p>
              <p className="mt-1.5 text-sm font-semibold text-foreground">
                {new Date(doctor.createdAt).toLocaleDateString("vi-VN")}
              </p>
            </div>
          </div>
        </div>

        {educationLines.length > 0 && (
          <div>
            <SectionHeading>Học vấn</SectionHeading>
            <div className="mt-5 flex flex-col">
              {educationLines.map((line, i) => (
                <div key={i} className="relative flex gap-4 pb-6 last:pb-0">
                  {i < educationLines.length - 1 && (
                    <span className="absolute top-6 left-2.25 h-full w-px bg-border" aria-hidden="true" />
                  )}
                  <span className="relative z-10 mt-1 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-gold/15">
                    <GraduationCap className="h-3 w-3 text-gold-deep" strokeWidth={2} />
                  </span>
                  <p className="text-sm leading-relaxed text-foreground">{line}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {doctor.bio && (
          <div>
            <SectionHeading>Giới thiệu</SectionHeading>
            <div className="relative mt-5 rounded-2xl bg-secondary/40 px-6 py-5">
              <Quote className="absolute top-4 left-4 h-5 w-5 text-gold/40" strokeWidth={2} />
              <p className="pl-7 text-sm leading-relaxed whitespace-pre-line text-foreground">{doctor.bio}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
