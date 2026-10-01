import { Search, UserRound } from "lucide-react";

import { prisma } from "@/lib/server/prisma";
import { ScopeFrame } from "@/components/scope-frame";
import { PatientCard } from "@/components/doctor/patient-card";

/** "Bệnh nhân" -- same bigger-card upgrade Hàng đợi already got (see
 * queue/page.tsx), not the old thin list-row version, but focused on the
 * PATIENT (contact info, demographics) rather than their latest case --
 * that's Hàng đợi's job. A default avatar, not a scan thumbnail: schema.prisma
 * has no profile-photo field for a patient, and using their latest scan's
 * photo here would conflate "this person" with "their most recent result."
 * Each card links through to app/doctor/patients/[id], the patient's chart.
 *
 * Search (?q=) is a plain GET form, not a client component with debounced
 * fetch -- this whole page is already a Server Component reading straight
 * from Prisma, and Next's own navigation makes a full-page GET here just as
 * fast as a fetch would be, with none of the extra client-side state. No
 * pagination yet (a genuinely different kind of change, not a "just add a
 * skip/take" one -- the empty vs. no-results copy below and PatientCard's
 * own layout don't need to change for that, but a page-size decision does)
 * -- this was the fast, real fix for "no way to find one patient among
 * many," left for its own pass. */
export default async function DoctorPatientsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const patients = await prisma.user.findMany({
    where: {
      role: "patient",
      ...(query
        ? { OR: [{ fullName: { contains: query, mode: "insensitive" } }, { email: { contains: query, mode: "insensitive" } }] }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { scans: true, multidiseaseScreenings: true } },
      scans: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true, createdAt: true } },
      multidiseaseScreenings: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true, createdAt: true } },
    },
  });

  return (
    <>
      <div className="flex items-baseline justify-between gap-4 border-b border-border pb-7">
        <p className="font-condensed text-xs uppercase tracking-[0.25em] text-teal-deep">Fundas · Bàn khám</p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Bệnh nhân</h1>
      </div>

      <form action="/doctor/patients" className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Tìm theo tên hoặc email..."
          className="h-12 w-full rounded-full border border-border bg-card pr-4 pl-11 text-sm text-foreground outline-none transition-shadow focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </form>

      {patients.length === 0 ? (
        <div className="flex flex-col items-center gap-6 rounded-[2rem] border border-border/60 bg-linear-to-br from-secondary/70 via-background to-background px-6 py-20 text-center sm:rounded-[2.75rem]">
          <ScopeFrame size={140} ringColor="var(--color-border)" interiorClassName="bg-linear-to-br from-secondary to-background">
            <div className="flex h-full w-full items-center justify-center">
              <UserRound className="h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
            </div>
          </ScopeFrame>
          <p className="text-sm text-muted-foreground">
            {query ? `Không tìm thấy bệnh nhân nào khớp với "${query}".` : "Chưa có bệnh nhân nào đăng ký."}
          </p>
        </div>
      ) : (
        <div>
          <p className="mb-4 font-condensed text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {patients.length} bệnh nhân{query ? ` khớp với "${query}"` : ""}
          </p>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {patients.map((patient, i) => {
              const latestScan = patient.scans[0] ?? null;
              const latestScreening = patient.multidiseaseScreenings[0] ?? null;

              // Whichever of the two is chronologically more recent decides
              // the "last activity" timestamp shown -- a patient's newest
              // thing is the newest thing regardless of which feature
              // produced it.
              const lastActivityAt =
                latestScan && (!latestScreening || latestScan.createdAt >= latestScreening.createdAt)
                  ? latestScan.createdAt.toISOString()
                  : (latestScreening?.createdAt.toISOString() ?? null);

              return (
                <PatientCard
                  key={patient.id}
                  index={i}
                  patient={{
                    id: patient.id,
                    fullName: patient.fullName,
                    email: patient.email,
                    phone: patient.phone,
                    gender: patient.gender,
                    dateOfBirth: patient.dateOfBirth ? patient.dateOfBirth.toISOString() : null,
                    createdAt: patient.createdAt.toISOString(),
                    scanCount: patient._count.scans,
                    screeningCount: patient._count.multidiseaseScreenings,
                    lastActivityAt,
                  }}
                />
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
