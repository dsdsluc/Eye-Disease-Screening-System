import { NewCaseWizard } from "@/components/doctor/new-case-wizard";

/** "Ca mới" -- doctor-initiated intake for a patient who isn't self-serving
 * through /upload. Real end to end: submitting POSTs to /api/doctor/new-case
 * (NewCaseWizard's own comment has the full flow), which creates both the
 * walk-in patient User row and their first Scan, then navigates to the real
 * case page -- not a UI-only mock. */
export default function DoctorNewCasePage() {
  return (
    <>
      <div className="flex items-baseline justify-between gap-4 border-b border-border pb-7">
        <p className="font-condensed text-xs uppercase tracking-[0.25em] text-teal-deep">Fundas · Bàn khám</p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Ca mới</h1>
      </div>

      <NewCaseWizard />
    </>
  );
}
