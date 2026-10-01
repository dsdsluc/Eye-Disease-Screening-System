"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Eye, Pencil, Sparkles } from "lucide-react";

import { cn, isRichTextEmpty } from "@/lib/utils";
import { DISEASE_INFO } from "@/lib/multidisease";
import type { GlaucomaLabel } from "@/lib/glaucoma";
import { type GlaucomaReview, getGlaucomaReview, saveGlaucomaReview } from "@/lib/doctor";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { RichNoteEditor } from "@/components/doctor/rich-note-editor";

const LABELS: { value: GlaucomaLabel; label: string }[] = [
  { value: "normal", label: "Bình thường" },
  { value: "glaucoma", label: "Tăng nhãn áp" },
];

const FOLLOW_UP_OPTIONS = ["12 tháng", "6 tháng", "3 tháng", "1 tháng", "Khẩn cấp (trong tuần)"] as const;
type FollowUp = (typeof FOLLOW_UP_OPTIONS)[number];

// Glaucoma damage is progressive and typically doesn't reverse -- a doctor
// confirming the AI's "glaucoma" reading suggests a nearer-term follow-up
// than DR's own mid-severity grades would, same clinical-convention spirit
// as DoctorConfirmationForm's FOLLOW_UP_SUGGESTION.
const FOLLOW_UP_SUGGESTION: Record<GlaucomaLabel, FollowUp> = {
  normal: "12 tháng",
  glaucoma: "3 tháng",
};

type Draft = {
  confirmedLabel: GlaucomaLabel | null;
  followUp: FollowUp;
  followUpTouched: boolean;
  note: string;
};

function draftKey(caseId: string) {
  return `fundas:glaucoma-draft:${caseId}`;
}

/** Doctor-side equivalent of DoctorConfirmationForm, shaped for glaucoma's
 * own data instead of copying DR's: config/glaucoma/config.json's labels
 * are binary ("normal"/"glaucoma"), not a 0-4 ordinal grade, so this is a
 * single pick between two buttons, not a 5-way scale -- closer in spirit to
 * DoctorConfirmationForm (one value, not a set) than to
 * ScreeningConfirmationForm's multi-select, since a person either has
 * glaucoma signs on this specialist read or doesn't.
 *
 * One GlaucomaReview row per GlaucomaScreening (schema.prisma) -- same real-
 * persistence shape as its siblings: checks the server first, falls back to
 * a localStorage draft only for an in-progress, not-yet-saved edit. */
export function GlaucomaConfirmationForm({ aiLabel, caseId }: { aiLabel: GlaucomaLabel; caseId: string }) {
  const [confirmedLabel, setConfirmedLabel] = useState<GlaucomaLabel | null>(null);
  const [followUp, setFollowUp] = useState<FollowUp>(FOLLOW_UP_SUGGESTION[aiLabel]);
  const [followUpTouched, setFollowUpTouched] = useState(false);
  const [note, setNote] = useState("");
  const [restoredDraft, setRestoredDraft] = useState(false);

  const [loading, setLoading] = useState(true);
  const [finalizedReview, setFinalizedReview] = useState<GlaucomaReview | null>(null);
  const [isFinalized, setIsFinalized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const review = await getGlaucomaReview(caseId);
        if (cancelled) return;
        if (review) {
          setConfirmedLabel(review.confirmedLabel);
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
          setConfirmedLabel(draft.confirmedLabel);
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
    const draft: Draft = { confirmedLabel, followUp, followUpTouched, note };
    const isEmpty = confirmedLabel === null && isRichTextEmpty(note);
    try {
      if (isEmpty) localStorage.removeItem(draftKey(caseId));
      else localStorage.setItem(draftKey(caseId), JSON.stringify(draft));
    } catch {
      // storage unavailable (private window, quota) -- draft just won't persist
    }
  }, [caseId, confirmedLabel, followUp, followUpTouched, note, loading, isFinalized]);

  const hasConfirmed = confirmedLabel !== null;
  const disagreesWithAi = hasConfirmed && confirmedLabel !== aiLabel;

  function selectLabel(label: GlaucomaLabel) {
    setConfirmedLabel(label);
    if (!followUpTouched) setFollowUp(FOLLOW_UP_SUGGESTION[label]);
    setIsFinalized(false);
    setSaveError(null);
  }

  async function handleFinalize() {
    if (!hasConfirmed || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const saved = await saveGlaucomaReview(caseId, { confirmedLabel: confirmedLabel!, note, followUp });
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
          <Eye className="h-4 w-4 text-teal-deep" strokeWidth={1.75} />
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
              <label className="text-sm font-medium text-foreground">Kết luận theo bác sĩ</label>
              <button
                type="button"
                onClick={() => selectLabel(aiLabel)}
                className="flex items-center gap-1.5 rounded-full border border-teal-deep/30 bg-teal/10 px-3 py-1.5 text-xs font-medium text-teal-deep transition-colors hover:bg-teal/15"
              >
                <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />
                Đồng ý với AI ({aiLabel === "glaucoma" ? DISEASE_INFO.glaucoma.label : "Bình thường"})
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {LABELS.map(({ value, label }) => {
                const selected = confirmedLabel === value;
                const color = value === "glaucoma" ? DISEASE_INFO.glaucoma.color : "var(--color-sev-0)";
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => selectLabel(value)}
                    className={cn(
                      "rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
                      selected ? "border-transparent text-white" : "border-border text-muted-foreground hover:bg-secondary"
                    )}
                    style={selected ? { backgroundColor: color } : undefined}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {hasConfirmed && (
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
                <span>Khác với AI ({aiLabel === "glaucoma" ? "Tăng nhãn áp" : "Bình thường"}).</span>
              ) : (
                <span>Đồng thuận với AI.</span>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Ghi chú lâm sàng thêm</label>
            <RichNoteEditor
              initialContent={note}
              onChange={setNote}
              placeholder="Quan sát khác, đo nhãn áp thực tế, hoặc lưu ý cho lần tái khám sau (không bắt buộc)."
            />
          </div>

          <div className="flex flex-wrap items-end justify-between gap-6 border-t border-border pt-6">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="glaucoma-follow-up" className="text-sm font-medium text-foreground">
                Đề xuất tái khám
              </label>
              <select
                id="glaucoma-follow-up"
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
                  {!hasConfirmed && <p className="text-xs text-muted-foreground">Chọn kết luận trước khi chốt ca.</p>}
                  <Button
                    type="button"
                    onClick={handleFinalize}
                    disabled={!hasConfirmed || saving}
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
