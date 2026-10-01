import { cn } from "@/lib/utils";

const SEGMENTS = [
  { grade: 0, label: "Không DR", color: "var(--color-sev-0)" },
  { grade: 1, label: "Nhẹ", color: "var(--color-sev-1)" },
  { grade: 2, label: "Trung bình", color: "var(--color-sev-2)" },
  { grade: 3, label: "Nặng", color: "var(--color-sev-3)" },
  { grade: 4, label: "Tăng sinh", color: "var(--color-sev-4)" },
] as const;

/**
 * A 5-segment clinical grading strip, not a decorative progress bar: each
 * segment is a real ICDR severity class and the active one is the model's
 * actual grade for this image.
 */
export function SeverityGauge({ grade }: { grade: number }) {
  return (
    <div className="w-full">
      <div className="flex gap-1.5">
        {SEGMENTS.map((seg) => {
          const active = seg.grade === grade;
          return (
            <div
              key={seg.grade}
              className="h-2.5 flex-1 rounded-full transition-all duration-700 ease-out"
              style={{
                backgroundColor: seg.color,
                opacity: active ? 1 : 0.22,
                transform: active ? "scaleY(1.7)" : "scaleY(1)",
              }}
            />
          );
        })}
      </div>
      <div className="mt-3 flex gap-1.5 font-condensed text-[10px] uppercase tracking-wider text-muted-foreground">
        {SEGMENTS.map((seg) => (
          <div
            key={seg.grade}
            className={cn(
              "flex-1 text-center transition-colors duration-500",
              seg.grade === grade && "font-semibold text-foreground"
            )}
          >
            {seg.label}
          </div>
        ))}
      </div>
    </div>
  );
}
