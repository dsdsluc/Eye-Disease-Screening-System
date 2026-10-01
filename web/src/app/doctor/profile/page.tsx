import { prisma } from "@/lib/server/prisma";
import { getSessionUser } from "@/lib/server/auth";
import { DoctorProfileView } from "@/components/doctor/doctor-profile-view";

/** "Hồ sơ bác sĩ" -- shows whoever is logged in as a doctor; /doctor stays
 * public for now (no role gate, per the layout's own comment), so a
 * visitor with no session -- or logged in as a patient -- falls back to
 * the one doctor account that exists rather than showing nothing. That
 * fallback stops being right once there's more than one doctor, but
 * that's a real access-control decision for later, not something to fake
 * here. Editing (DoctorProfileView) is gated separately: only shown when
 * the logged-in session IS this doctor, since the fallback above can hand
 * back a profile that isn't the viewer's own. */
export default async function DoctorProfilePage() {
  const session = await getSessionUser();
  const doctor =
    session?.role === "doctor"
      ? await prisma.user.findUnique({ where: { id: session.id } })
      : await prisma.user.findFirst({ where: { role: "doctor" } });

  return (
    <>
      <div className="flex items-baseline justify-between gap-4 border-b border-border pb-7">
        <p className="font-condensed text-xs uppercase tracking-[0.25em] text-teal-deep">Fundas · Bàn khám</p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Hồ sơ bác sĩ</h1>
      </div>

      {doctor ? (
        <DoctorProfileView
          canEdit={session?.id === doctor.id}
          doctor={{
            id: doctor.id,
            fullName: doctor.fullName,
            email: doctor.email,
            phone: doctor.phone,
            title: doctor.title,
            specialty: doctor.specialty,
            licenseNumber: doctor.licenseNumber,
            hospital: doctor.hospital,
            yearsOfExperience: doctor.yearsOfExperience,
            education: doctor.education,
            bio: doctor.bio,
            avatarUrl: doctor.avatarUrl,
            createdAt: doctor.createdAt.toISOString(),
          }}
        />
      ) : (
        <p className="text-sm text-muted-foreground">Chưa có tài khoản bác sĩ nào trong hệ thống.</p>
      )}
    </>
  );
}
