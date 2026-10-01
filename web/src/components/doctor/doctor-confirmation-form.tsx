"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Pencil, Sparkles, Stethoscope } from "lucide-react";

import { cn, isRichTextEmpty } from "@/lib/utils";
import { GRADE_COLORS, GRADE_LABELS } from "@/lib/api";
import { type DoctorReview, getDoctorReview, saveDoctorReview } from "@/lib/doctor";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { RichNoteEditor } from "@/components/doctor/rich-note-editor";

const FOLLOW_UP_OPTIONS = ["12 tháng", "6 tháng", "3 tháng", "1 tháng", "Khẩn cấp (trong tuần)"] as const;
type FollowUp = (typeof FOLLOW_UP_OPTIONS)[number];

// A doctor's own grade doesn't have to match the AI's for the follow-up
// interval to make sense -- suggest off of DR clinical convention (mild
// disease → annual, proliferative → urgent), then let the doctor override
// the interval directly if their judgment differs.
const FOLLOW_UP_SUGGESTION: Record<number, FollowUp> = {
  0: "12 tháng",
  1: "12 tháng",
  2: "6 tháng",
  3: "3 tháng",
  4: "Khẩn cấp (trong tuần)",
};

type Draft = {
  doctorGrade: number | null;
  followUp: FollowUp;
  followUpTouched: boolean;
  note: string;
};

function draftKey(caseId: string) {
  return `fundas:doctor-draft:${caseId}`;
}

/** "Ghi chú & xác nhận của bác sĩ" -- deliberately an ADDITIVE record next
 * to the AI's reading (its own DoctorReview row, schema.prisma), never a
 * field that overwrites `Scan.grade`. The doctor picks their OWN grade
 * independently; the two readings sit side by side afterward, agreement or
 * not, both preserved. The doctor's grade is final on its own -- no
 * justification is required to differ from the AI (the agreement/
 * disagreement line below is informational, not a gate).
 *
 * One DoctorReview row per Scan: on mount this checks the server for an
 * existing one first (a case already reviewed, possibly by a different
 * doctor session) and only falls back to the localStorage draft -- an
 * in-progress-typing convenience, not the persistence layer -- when there
 * is no saved review yet. */
export function DoctorConfirmationForm({ aiGrade, caseId }: { aiGrade: number; caseId: string }) {
  const [doctorGrade, setDoctorGrade] = useState<number | null>(null);
  const [followUp, setFollowUp] = useState<FollowUp>(FOLLOW_UP_SUGGESTION[aiGrade]);
  const [followUpTouched, setFollowUpTouched] = useState(false);
  const [note, setNote] = useState("");
  const [restoredDraft, setRestoredDraft] = useState(false);

  const [loading, setLoading] = useState(true);
  const [finalizedReview, setFinalizedReview] = useState<DoctorReview | null>(null);
  const [isFinalized, setIsFinalized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // On mount: prefer a review already saved on the server (this case may
  // have been reviewed before, in an earlier session or by another doctor
  // account); only fall back to a local draft -- a doctor getting pulled
  // away mid-note shouldn't lose typed reasoning -- when nothing is saved
  // yet. Both branches only run after an await, so this isn't the
  // synchronous "setState during an effect" pattern the set-state-in-effect
  // rule warns about -- it's syncing from sources unavailable at render
  // time (network, localStorage), same as any data-fetching effect.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const review = await getDoctorReview(caseId);
        if (cancelled) return;
        if (review) {
          setDoctorGrade(review.doctorGrade);
          setFollowUp(review.followUp as FollowUp);
          setFollowUpTouched(true);
          setNote(review.note ?? "");
          setFinalizedReview(review);
          setIsFinalized(true);
          setLoading(false);
          return;
        }
      } catch {
        // couldn't reach the API -- still worth checking for a local draft below
      }
      if (cancelled) return;
      try {
        const raw = localStorage.getItem(draftKey(caseId));
        if (raw) {
          const draft = JSON.parse(raw) as Draft;
          setDoctorGrade(draft.doctorGrade);
          setFollowUp(draft.followUp);
          setFollowUpTouched(draft.followUpTouched);
          setNote(draft.note);
          setRestoredDraft(true);
        }
      } catch {
        // corrupt/missing draft -- start clean
      }
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [caseId]);

  useEffect(() => {
    if (loading || isFinalized) return;
    const draft: Draft = { doctorGrade, followUp, followUpTouched, note };
    const isEmpty = doctorGrade === null && isRichTextEmpty(note);
    try {
      if (isEmpty) localStorage.removeItem(draftKey(caseId));
      else localStorage.setItem(draftKey(caseId), JSON.stringify(draft));
    } catch {
      // storage unavailable (private window, quota) -- draft just won't persist
    }
  }, [caseId, doctorGrade, followUp, followUpTouched, note, loading, isFinalized]);

  // Number-key shortcuts for the common "just confirm a grade" motion --
  // guarded against firing while typing in either textarea.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "TEXTAREA" || tag === "SELECT" || tag === "INPUT") return;
      if (e.key >= "0" && e.key <= "4") selectGrade(Number(e.key));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followUpTouched]);

  const hasGraded = doctorGrade !== null;
  const disagreesWithAi = hasGraded && doctorGrade !== aiGrade;

  function selectGrade(grade: number) {
    setDoctorGrade(grade);
    if (!followUpTouched) setFollowUp(FOLLOW_UP_SUGGESTION[grade]);
    setIsFinalized(false);
    setSaveError(null);
  }

  async function handleFinalize() {
    if (!hasGraded || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const saved = await saveDoctorReview(caseId, { doctorGrade: doctorGrade!, note, followUp });
      setFinalizedReview(saved);
      setIsFinalized(true);
      try {
        localStorage.removeItem(draftKey(caseId));
      } catch {
        // ignore
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Không lưu được ghi chú bác sĩ.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="glossy shadow-bubble flex flex-col gap-7 rounded-2xl border border-border/60 bg-card px-7 py-8 sm:px-10 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Stethoscope className="h-4 w-4 text-teal-deep" strokeWidth={1.75} />
          <h2 className="text-base font-semibold text-foreground">Ghi chú &amp; xác nhận của bác sĩ</h2>
        </div>
        {restoredDraft && !isFinalized && (
          <span className="font-condensed text-[10px] uppercase tracking-wider text-muted-foreground">
            Đã khôi phục bản nháp
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Đang tải ghi chú...</p>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="text-sm font-medium text-foreground">Mức độ theo bác sĩ</label>
              <button
                type="button"
                onClick={() => selectGrade(aiGrade)}
                className="flex items-center gap-1.5 rounded-full border border-teal-deep/30 bg-teal/10 px-3 py-1.5 text-xs font-medium text-teal-deep transition-colors hover:bg-teal/15"
              >
                <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />
                Đồng ý với AI ({GRADE_LABELS[aiGrade]})
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {[0, 1, 2, 3, 4].map((grade) => {
                const selected = doctorGrade === grade;
                return (
                  <button
                    key={grade}
                    type="button"
                    aria-label={`Chấm mức ${grade}`}
                    aria-pressed={selected}
                    onClick={() => selectGrade(grade)}
                    className={cn(
                      "flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
                      selected ? "border-transparent text-white" : "border-border text-muted-foreground hover:bg-secondary"
                    )}
                    style={selected ? { backgroundColor: GRADE_COLORS[grade] } : undefined}
                  >
                    <span className="font-mono">{grade}</span>
                    {GRADE_LABELS[grade]}
                  </button>
                );
              })}
              <kbd className="hidden items-center rounded-md border border-border bg-secondary px-2 font-mono text-[10px] text-muted-foreground sm:flex">
                phím 0-4
              </kbd>
            </div>
          </div>

          {hasGraded && (
            <div
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm",
                disagreesWithAi ? "bg-sev-3/10 text-sev-3" : "bg-sev-0/10 text-sev-0"
              )}
            >
              {disagreesWithAi ? (
                <AlertTriangle className="h-4 w-4 shrink-0" />
              ) : (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              )}
              {disagreesWithAi ? (
                <span>
                  Khác với AI ({GRADE_LABELS[aiGrade]}) — chênh lệch {Math.abs(doctorGrade! - aiGrade)} mức.
                </span>
              ) : (
                <span>Đồng thuận với AI ({GRADE_LABELS[aiGrade]}).</span>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Ghi chú lâm sàng thêm</label>
            <RichNoteEditor
              initialContent={note}
              onChange={setNote}
              placeholder="Quan sát khác, tiền sử liên quan, hoặc lưu ý cho lần tái khám sau (không bắt buộc)."
            />
          </div>

          <div className="flex flex-wrap items-end justify-between gap-6 border-t border-border pt-6">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="follow-up" className="text-sm font-medium text-foreground">
                Đề xuất tái khám
              </label>
              <select
                id="follow-up"
                value={followUp}
                onChange={(e) => {
                  setFollowUpTouched(true);
                  setFollowUp(e.target.value as FollowUp);
                }}
                className="h-11 w-56 rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none transition-shadow focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {FOLLOW_UP_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {isFinalized && finalizedReview ? (
              <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
                <FormMessage kind="ok" className="rounded-lg bg-sev-0/10 px-3 py-2.5">
                  Đã chốt bởi {finalizedReview.doctorName} lúc{" "}
                  {new Date(finalizedReview.updatedAt).toLocaleString("vi-VN")}.
                </FormMessage>
                <button
                  type="button"
                  onClick={() => setIsFinalized(false)}
                  className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Chỉnh sửa lại
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-end gap-2">
                {saveError && <FormMessage kind="error">{saveError}</FormMessage>}
                <div className="flex items-center gap-3">
                  {!hasGraded && <p className="text-xs text-muted-foreground">Chọn mức độ trước khi chốt ca.</p>}
                  <Button
                    type="button"
                    onClick={handleFinalize}
                    disabled={!hasGraded || saving}
                    className="glossy shadow-bubble w-fit rounded-full"
                  >
                    <CheckCircle2 className="h-4 w-4" data-icon="inline-start" />
                    {saving ? "Đang lưu..." : "Lưu & chốt ca"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
