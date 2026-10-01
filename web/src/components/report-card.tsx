import type { ReportResult } from "@/lib/api";

/**
 * Styled like a clinical printout slip -- the one place the warm "paper"
 * tone appears, deliberately set apart from the dark instrument-panel chrome
 * around it, because this is the part meant to be read closely.
 */
export function ReportCard({ report }: { report: ReportResult }) {
  return (
    <div className="w-full rounded-2xl bg-paper px-7 py-6 text-ink">
      <p className="font-condensed text-xs uppercase tracking-[0.2em] text-maroon">
        Diễn giải hỗ trợ đọc ảnh
      </p>
      <h3 className="mt-1 text-lg font-semibold">{report.label}</h3>

      <p className="mt-4 text-sm leading-relaxed text-ink/80">{report.summary}</p>

      {report.attentionPoints.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {report.attentionPoints.map((point, i) => (
            <li key={i} className="flex gap-2 text-sm leading-relaxed text-ink/80">
              <span aria-hidden="true" className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-maroon" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 rounded-lg bg-ink/5 px-4 py-3">
        <p className="font-condensed text-[11px] uppercase tracking-wider text-maroon">Đề xuất tái khám</p>
        <p className="mt-1 text-sm font-medium">{report.followUp}</p>
      </div>

      <p className="mt-5 border-t border-ink/10 pt-4 font-condensed text-[11px] leading-relaxed text-ink/50">
        {report.disclaimer}
      </p>
    </div>
  );
}
