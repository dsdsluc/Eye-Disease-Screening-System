"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Microscope, Pencil, Sparkles } from "lucide-react";

import { cn, isRichTextEmpty } from "@/lib/utils";
import { DISEASE_INFO, DISEASE_LABELS, RECOMMENDATION_OPTIONS, type DiseaseLabel, type Recommendation } from "@/lib/multidisease";
import { type ScreeningReview, getScreeningReview, saveScreeningReview } from "@/lib/doctor";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { RichNoteEditor } from "@/components/doctor/rich-note-editor";

type Draft = {
  confirmedLabels: DiseaseLabel[];
  recommendation: Recommendation;
  note: string;
};

function draftKey(caseId: string) {
  return `fundas:screening-draft:${caseId}`;
}

/** Doctor-side equivalent of DoctorConfirmationForm (the DR "Ghi chú & xác
 * nhận" form), but shaped for this feature's own data instead of copying
 * that one: an 8-way categorical label has no 0-4 ordinal scale to pick a
 * single "grade" from, and -- per the caveat already in
 * MultidiseaseResultPanel ("một người có thể có dấu hiệu của nhiều bệnh
 * cùng lúc") -- real pathology can co-occur even though the model only
 * ever reports one top label. So this is a MULTI-select over all 8 labels
 * (the doctor confirms every condition they actually see), not a single
 * pick, and "recommendation" is a coarse next-action category instead of
 * DR's follow-up interval dropdown, since a glaucoma referral and a
 * cataract note don't share a timeline scale.
 *
 * One ScreeningReview row per MultidiseaseScreening (schema.prisma) --
 * same real-persistence shape as DoctorConfirmationForm: checks the server
 * first, falls back to a localStorage draft only for an in-progress,
 * not-yet-saved edit. */
export function ScreeningConfirmationForm({ topLabel, caseId }: { topLabel: DiseaseLabel; caseId: string }) {
  const [confirmedLabels, setConfirmedLabels] = useState<DiseaseLabel[]>([]);
  const [recommendation, setRecommendation] = useState<Recommendation>("Tái khám định kỳ");
  const [note, setNote] = useState("");
  const [restoredDraft, setRestoredDraft] = useState(false);

  const [loading, setLoading] = useState(true);
  const [finalizedReview, setFinalizedReview] = useState<ScreeningReview | null>(null);
  const [isFinalized, setIsFinalized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const review = await getScreeningReview(caseId);
        if (cancelled) return;
        if (review) {
          setConfirmedLabels(review.confirmedLabels);
          setRecommendation(review.recommendation);
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
          setConfirmedLabels(draft.confirmedLabels);
          setRecommendation(draft.recommendation);
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
    const draft: Draft = { confirmedLabels, recommendation, note };
    const isEmpty = confirmedLabels.length === 0 && isRichTextEmpty(note);
    try {
      if (isEmpty) localStorage.removeItem(draftKey(caseId));
      else localStorage.setItem(draftKey(caseId), JSON.stringify(draft));
    } catch {
      // storage unavailable (private window, quota) -- draft just won't persist
    }
  }, [caseId, confirmedLabels, recommendation, note, loading, isFinalized]);

  const hasConfirmed = confirmedLabels.length > 0;

  function toggleLabel(label: DiseaseLabel) {
    setIsFinalized(false);
    setSaveError(null);
    setConfirmedLabels((prev) => (prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]));
  }

  function agreeWithAi() {
    setIsFinalized(false);
    setSaveError(null);
    setConfirmedLabels([topLabel]);
  }

  async function handleFinalize() {
    if (!hasConfirmed || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const saved = await saveScreeningReview(caseId, { confirmedLabels, recommendation, note });
      setFinalizedReview(saved);
      setIsFinalized(true);
      try {
        localStorage.removeItem(draftKey(caseId));
      } catch {
        // ignore
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Không lưu được xác nhận của bác sĩ.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="glossy shadow-bubble flex flex-col gap-7 rounded-2xl border border-dashed border-gold-deep/40 bg-card/60 px-7 py-8 sm:px-10 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Microscope className="h-4 w-4 text-gold-deep" strokeWidth={1.75} />
          <h2 className="text-base font-semibold text-foreground">Xác nhận của bác sĩ (đa bệnh)</h2>
        </div>
        {restoredDraft && !isFinalized && (
          <span className="font-condensed text-[10px] uppercase tracking-wider text-muted-foreground">
            Đã khôi phục bản nháp
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Đang tải xác nhận...</p>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="text-sm font-medium text-foreground">Bệnh lý xác nhận bởi bác sĩ</label>
              <button
                type="button"
                onClick={agreeWithAi}
                className="flex items-center gap-1.5 rounded-full border border-gold-deep/30 bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold-deep transition-colors hover:bg-gold/15"
              >
                <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />
                Đồng ý với AI ({DISEASE_INFO[topLabel].label})
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Có thể chọn nhiều hơn một bệnh lý -- một người có thể có dấu hiệu của nhiều bệnh cùng lúc, dù mô hình chỉ báo
              một nhãn mạnh nhất.
            </p>
            <div className="flex flex-wrap gap-2">
              {DISEASE_LABELS.map((label) => {
                const info = DISEASE_INFO[label];
                const selected = confirmedLabels.includes(label);
                return (
                  <button
                    key={label}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleLabel(label)}
                    className={cn(
                      "rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
                      selected ? "border-transparent text-white" : "border-border text-muted-foreground hover:bg-secondary"
                    )}
                    style={selected ? { backgroundColor: info.color } : undefined}
                  >
                    {info.label}
                  </button>
                );
              })}
            </div>
          </div>

          {hasConfirmed && (
            <div className="flex items-center gap-2 rounded-lg bg-sev-0/10 px-3 py-2.5 text-sm text-sev-0">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>
                Đã xác nhận {confirmedLabels.length} bệnh lý: {confirmedLabels.map((l) => DISEASE_INFO[l].label).join(", ")}.
              </span>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Ghi chú lâm sàng thêm</label>
            <RichNoteEditor
              initialContent={note}
              onChange={setNote}
              placeholder="Quan sát khác, mức độ nghi ngờ, hoặc lý do chọn/không chọn theo AI (không bắt buộc)."
            />
          </div>

          <div className="flex flex-wrap items-end justify-between gap-6 border-t border-border pt-6">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="screening-recommendation" className="text-sm font-medium text-foreground">
                Hướng xử lý tiếp theo
              </label>
              <select
                id="screening-recommendation"
                value={recommendation}
                onChange={(e) => setRecommendation(e.target.value as Recommendation)}
                className="h-11 w-64 rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none transition-shadow focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {RECOMMENDATION_OPTIONS.map((opt) => (
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
                  {!hasConfirmed && <p className="text-xs text-muted-foreground">Chọn ít nhất một bệnh lý trước khi chốt.</p>}
                  <Button
                    type="button"
                    onClick={handleFinalize}
                    disabled={!hasConfirmed || saving}
                    className="glossy shadow-bubble w-fit rounded-full"
                  >
                    <CheckCircle2 className="h-4 w-4" data-icon="inline-start" />
                    {saving ? "Đang lưu..." : "Lưu & chốt sàng lọc"}
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
