import { getSessionUser } from "@/lib/server/auth";
import { DoctorHeader } from "@/components/doctor/doctor-header";
import { DoctorNavCard } from "@/components/doctor/doctor-nav-card";

/** Doctor workspace shell (plans/plan.txt, plans/plan_multidisease.txt
 * section 4.4 -- rebuilding what the 2026-08-29 reset removed). PUBLIC for
 * now, deliberately: there's no `role === "doctor"` gate here on purpose --
 * whoever is logged in (or no one) can view every /doctor/* page. This is a
 * phase-1 layout/IA pass, not the finished feature; the role check plus
 * "reviewed"/override persistence are follow-up work (see the plan handed
 * back alongside this). Session lookup lives here (a Server Component) so
 * every page under this layout gets it for free without its own fetch.
 *
 * IA carried forward from the removed workspace (confirmed via its old
 * screenshot/seed scripts, since the pages themselves are gone): Bàn khám
 * (dashboard) / Hàng đợi (queue) / Bệnh nhân (patients) / Ca mới (new case
 * intake) / Hồ sơ bác sĩ (doctor's own profile) -- same five destinations,
 * same terminology, rebuilt against the CURRENT schema (Scan,
 * MultidiseaseScreening) instead of the removed one. */
export default async function DoctorLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  const doctorName = user?.fullName ?? null;

  return (
    <div className="flex flex-1 flex-col bg-background text-foreground">
      <div className="lg:hidden">
        <DoctorHeader doctorName={doctorName} />
      </div>

      <div className="mx-auto flex w-full max-w-[1400px] flex-1 items-start gap-8 px-4 pt-10 pb-16 sm:px-6 lg:pr-10 lg:pl-[6px]">
        <div className="hidden lg:sticky lg:top-8 lg:block">
          <DoctorNavCard doctorName={doctorName} />
        </div>
        <main className="flex min-w-0 flex-1 flex-col gap-10">{children}</main>
      </div>
    </div>
  );
}
