/** One labeled value in a CV/ID-card-style profile grid -- shared by
 * PatientProfileCard and DoctorProfileCard so the "icon + condensed label
 * above, value (or 'Chưa cập nhật') below, optionally a tel:/mailto: link"
 * treatment can't drift between the two. */
export function ProfileField({
  icon: Icon,
  label,
  value,
  href,
  className,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: string | null;
  /** tel:/mailto: -- makes the value clickable instead of plain text. */
  href?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="flex items-center gap-1.5 font-condensed text-[10px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
        {label}
      </p>
      {value && href ? (
        <a href={href} className="mt-1 block text-sm font-medium text-teal-deep hover:underline">
          {value}
        </a>
      ) : (
        <p className="mt-1 text-sm font-medium whitespace-pre-line text-foreground">
          {value || <span className="font-normal text-muted-foreground/70">Chưa cập nhật</span>}
        </p>
      )}
    </div>
  );
}
