"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Pencil, ScanFace, Sparkles } from "lucide-react";

import { cn, isRichTextEmpty } from "@/lib/utils";
import { DISEASE_INFO } from "@/lib/multidisease";
import type { CataractLabel } from "@/lib/cataract";
import { type CataractReview, getCataractReview, saveCataractReview } from "@/lib/doctor";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { RichNoteEditor } from "@/components/doctor/rich-note-editor";

const LABELS: { value: CataractLabel; label: string }[] = [
  { value: "normal", label: "Bình thường" },
  { value: "cataract", label: "Đục thủy tinh thể" },
];

const FOLLOW_UP_OPTIONS = ["12 tháng", "6 tháng", "3 tháng", "1 tháng", "Khẩn cấp (trong tuần)"] as const;
type FollowUp = (typeof FOLLOW_UP_OPTIONS)[number];

// Cataract itself progresses slowly (unlike glaucoma's nerve damage), so a
// confirmed "cataract" reading suggests a routine specialist referral
// rather than an urgent recheck -- still nearer-term than a clean result,
// same clinical-convention spirit as the other confirmation forms'
// FOLLOW_UP_SUGGESTION.
const FOLLOW_UP_SUGGESTION: Record<CataractLabel, FollowUp> = {
  normal: "12 tháng",
  cataract: "6 tháng",
};

type Draft = {
  confirmedLabel: CataractLabel | null;
  followUp: FollowUp;
  followUpTouched: boolean;
  note: string;
};

function draftKey(caseId: string) {
  return `fundas:cataract-draft:${caseId}`;
}

/** Doctor-side equivalent of DoctorConfirmationForm, shaped for cataract's
 * own data instead of copying DR's -- same binary single-pick shape as
 * GlaucomaConfirmationForm (config/cataract/config.json's labels:
 * ["normal","cataract"]), its own component rather than a shared one with
 * glaucoma's since every screening feature here keeps its own confirmation
 * form (never-equal-confidence language: a shared component would make
 * cataract's real caveats -- config/cataract/config.json's "known_caveats"
 * -- too easy to silently drift into glaucoma's better-validated ones).
 *
 * One CataractReview row per CataractScreening (schema.prisma) -- same
 * real-persistence shape as its siblings. */
export function CataractConfirmationForm({ aiLabel, caseId }: { aiLabel: CataractLabel; caseId: string }) {
  const [confirmedLabel, setConfirmedLabel] = useState<CataractLabel | null>(null);
  const [followUp, setFollowUp] = useState<FollowUp>(FOLLOW_UP_SUGGESTION[aiLabel]);
  const [followUpTouched, setFollowUpTouched] = useState(false);
  const [note, setNote] = useState("");
  const [restoredDraft, setRestoredDraft] = useState(false);

  const [loading, setLoading] = useState(true);
  const [finalizedReview, setFinalizedReview] = useState<CataractReview | null>(null);
  const [isFinalized, setIsFinalized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const review = await getCataractReview(caseId);
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

  function selectLabel(label: CataractLabel) {
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
      const saved = await saveCataractReview(caseId, { confirmedLabel: confirmedLabel!, note, followUp });
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
          <ScanFace className="h-4 w-4 text-sev-1" strokeWidth={1.75} />
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
                className="flex items-center gap-1.5 rounded-full border border-sev-1/30 bg-sev-1/10 px-3 py-1.5 text-xs font-medium text-sev-1 transition-colors hover:bg-sev-1/15"
              >
                <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />
                Đồng ý với AI ({aiLabel === "cataract" ? DISEASE_INFO.cataract.label : "Bình thường"})
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {LABELS.map(({ value, label }) => {
                const selected = confirmedLabel === value;
                const color = value === "cataract" ? "var(--color-sev-1)" : "var(--color-sev-0)";
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
                <span>Khác với AI ({aiLabel === "cataract" ? "Đục thủy tinh thể" : "Bình thường"}).</span>
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
              placeholder="Quan sát khác, mức độ đục, hoặc lưu ý cho lần tái khám sau (không bắt buộc)."
            />
          </div>

          <div className="flex flex-wrap items-end justify-between gap-6 border-t border-border pt-6">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cataract-follow-up" className="text-sm font-medium text-foreground">
                Đề xuất tái khám
              </label>
              <select
                id="cataract-follow-up"
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
