"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Briefcase,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Contact,
  Droplet,
  FilePlus2,
  HeartPulse,
  IdCard,
  MapPin,
  Microscope,
  Phone,
  Sparkles,
  UserRound,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { GENDER_LABEL, GENDER_OPTIONS, BLOOD_TYPE_OPTIONS } from "@/lib/patient";
import { createNewCase } from "@/lib/doctor";
import { ScopeFrame } from "@/components/scope-frame";
import { UploadDropzone } from "@/components/upload-dropzone";
import { RichNoteEditor } from "@/components/doctor/rich-note-editor";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";

const STEPS = [
  { key: "patient", label: "Bệnh nhân" },
  { key: "clinical", label: "Lâm sàng" },
  { key: "photo", label: "Ảnh chụp" },
  { key: "review", label: "Xác nhận" },
] as const;

const inputClass =
  "h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
const labelClass = "text-sm font-medium text-foreground";

type PatientDraft = {
  fullName: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  nationalId: string;
  address: string;
  occupation: string;
  bloodType: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
};

type ClinicalDraft = {
  diabetesDurationYears: string;
  hba1c: string;
  bloodPressure: string;
  note: string;
};

const EMPTY_PATIENT: PatientDraft = {
  fullName: "",
  phone: "",
  dateOfBirth: "",
  gender: "",
  nationalId: "",
  address: "",
  occupation: "",
  bloodType: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
};

const EMPTY_CLINICAL: ClinicalDraft = { diabetesDurationYears: "", hba1c: "", bloodPressure: "", note: "" };

function Labeled({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  );
}

function SummaryField({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; label: string; value: string }) {
  return (
    <div>
      <p className="flex items-center gap-1.5 font-condensed text-[10px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-foreground">
        {value || <span className="font-normal text-muted-foreground/70">Chưa nhập</span>}
      </p>
    </div>
  );
}

/** "Ca mới" -- doctor-initiated intake for a walk-in patient. Submitting
 * (POST /api/doctor/new-case) creates a real User row for the patient --
 * one with no email/passwordHash (schema.prisma), since a walk-in intake
 * doesn't imply they ever get a login of their own, they're still a real
 * patient (Scan.userId points at them exactly like anyone self-registered)
 * -- plus their first Scan, then navigates straight to the real case page.
 *
 * Field set mirrors PatientProfileCard's (patient-profile-card.tsx) one for
 * one -- a walk-in intake collects exactly the columns the patient chart
 * later displays. The clinical fields (thời gian mắc tiểu đường, HbA1c) come
 * from the old pre-reset version of this page (see this file's git history /
 * the removed screenshot-new-case.mjs) -- real DR risk factors, not filler;
 * they land on Scan (schema.prisma), not User, since they're readings from
 * this visit, not permanent patient facts. */
export function NewCaseWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [patient, setPatient] = useState<PatientDraft>(EMPTY_PATIENT);
  const [clinical, setClinical] = useState<ClinicalDraft>(EMPTY_CLINICAL);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [alsoScreenMultidisease, setAlsoScreenMultidisease] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function patch<D extends object>(setter: React.Dispatch<React.SetStateAction<D>>, key: keyof D, value: string) {
    setter((prev) => ({ ...prev, [key]: value }));
  }

  function handlePhoto(file: File) {
    setPhoto(file);
    setPhotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }

  function resetPhoto() {
    setPhoto(null);
    setPhotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }

  const canLeavePatientStep = patient.fullName.trim().length > 0;
  const canLeavePhotoStep = photo !== null;
  const canGoNext = step === 0 ? canLeavePatientStep : step === 2 ? canLeavePhotoStep : true;

  function goNext() {
    if (!canGoNext) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function goBack() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit() {
    if (!photo || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const { scanId } = await createNewCase({ ...patient, ...clinical, alsoScreenMultidisease, file: photo });
      router.push(`/doctor/case/${scanId}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Không tạo được ca khám.");
      setSubmitting(false);
    }
  }

  return (
    <div className="glossy shadow-bubble flex flex-col gap-8 rounded-2xl border border-border/60 bg-card px-6 py-8 sm:px-10 sm:py-10">
      {/* Stepper -- same numbered-circle + connecting-line language as
          AnalysisDialog's upload progress (components/analysis-dialog.tsx),
          reused here for a multi-step FORM instead of an async process. */}
      <div className="flex items-center">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex flex-1 items-center last:flex-none">
            <button
              type="button"
              onClick={() => i < step && setStep(i)}
              disabled={i > step}
              className="flex flex-col items-center gap-2 disabled:cursor-default"
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold transition-colors duration-300",
                  i < step && "border-teal-deep bg-teal-deep text-paper",
                  i === step && "border-teal-deep text-teal-deep",
                  i > step && "border-border text-muted-foreground"
                )}
              >
                {i < step ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : i + 1}
              </span>
              <span
                className={cn(
                  "font-condensed text-[10px] uppercase tracking-wider transition-colors duration-300",
                  i <= step ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {s.label}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <div className="mx-2 h-px flex-1 bg-border">
                <motion.div
                  className="h-px bg-teal-deep"
                  initial={{ width: "0%" }}
                  animate={{ width: i < step ? "100%" : "0%" }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.25 }}
        >
          {step === 0 && (
            <div className="flex flex-col gap-6">
              <Labeled label="Họ và tên *">
                <input
                  value={patient.fullName}
                  onChange={(e) => patch(setPatient, "fullName", e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className={inputClass}
                />
              </Labeled>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Labeled label="Ngày sinh">
                  <input
                    type="date"
                    value={patient.dateOfBirth}
                    onChange={(e) => patch(setPatient, "dateOfBirth", e.target.value)}
                    className={inputClass}
                  />
                </Labeled>
                <Labeled label="Giới tính">
                  <select value={patient.gender} onChange={(e) => patch(setPatient, "gender", e.target.value)} className={inputClass}>
                    <option value="">Không muốn nêu</option>
                    {GENDER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </Labeled>
                <Labeled label="Số điện thoại">
                  <input
                    value={patient.phone}
                    onChange={(e) => patch(setPatient, "phone", e.target.value)}
                    placeholder="09xx xxx xxx"
                    className={inputClass}
                  />
                </Labeled>
                <Labeled label="Số CCCD/CMND">
                  <input
                    value={patient.nationalId}
                    onChange={(e) => patch(setPatient, "nationalId", e.target.value)}
                    className={inputClass}
                  />
                </Labeled>
                <Labeled label="Nhóm máu">
                  <select value={patient.bloodType} onChange={(e) => patch(setPatient, "bloodType", e.target.value)} className={inputClass}>
                    <option value="">Không rõ</option>
                    {BLOOD_TYPE_OPTIONS.map((bt) => (
                      <option key={bt} value={bt}>
                        {bt}
                      </option>
                    ))}
                  </select>
                </Labeled>
                <Labeled label="Nghề nghiệp">
                  <input
                    value={patient.occupation}
                    onChange={(e) => patch(setPatient, "occupation", e.target.value)}
                    className={inputClass}
                  />
                </Labeled>
              </div>
              <Labeled label="Địa chỉ thường trú">
                <input
                  value={patient.address}
                  onChange={(e) => patch(setPatient, "address", e.target.value)}
                  className={inputClass}
                />
              </Labeled>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Labeled label="Người liên hệ khẩn cấp">
                  <input
                    value={patient.emergencyContactName}
                    onChange={(e) => patch(setPatient, "emergencyContactName", e.target.value)}
                    className={inputClass}
                  />
                </Labeled>
                <Labeled label="SĐT người liên hệ">
                  <input
                    value={patient.emergencyContactPhone}
                    onChange={(e) => patch(setPatient, "emergencyContactPhone", e.target.value)}
                    className={inputClass}
                  />
                </Labeled>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                <Labeled label="Thời gian mắc tiểu đường (năm)">
                  <input
                    type="number"
                    min={0}
                    value={clinical.diabetesDurationYears}
                    onChange={(e) => patch(setClinical, "diabetesDurationYears", e.target.value)}
                    placeholder="VD: 8"
                    className={inputClass}
                  />
                </Labeled>
                <Labeled label="Chỉ số HbA1c gần nhất (%)">
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    value={clinical.hba1c}
                    onChange={(e) => patch(setClinical, "hba1c", e.target.value)}
                    placeholder="VD: 7.5"
                    className={inputClass}
                  />
                </Labeled>
                <Labeled label="Huyết áp">
                  <input
                    value={clinical.bloodPressure}
                    onChange={(e) => patch(setClinical, "bloodPressure", e.target.value)}
                    placeholder="VD: 130/85 mmHg"
                    className={inputClass}
                  />
                </Labeled>
              </div>
              <Labeled label="Ghi chú lâm sàng">
                <RichNoteEditor
                  initialContent={clinical.note}
                  onChange={(html) => patch(setClinical, "note", html)}
                  placeholder="Triệu chứng, tiền sử liên quan, lý do thăm khám (không bắt buộc)."
                />
              </Labeled>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col items-center gap-5">
              {photoPreview ? (
                <>
                  <ScopeFrame size={280} ringColor="var(--color-teal-deep)" interiorClassName="bg-ink-raised">
                    {/* eslint-disable-next-line @next/next/no-img-element -- a local
                        blob: URL preview, not a remote/optimizable image */}
                    <img src={photoPreview} alt="Ảnh vừa chọn" className="h-full w-full object-cover" />
                  </ScopeFrame>
                  <button
                    type="button"
                    onClick={resetPhoto}
                    className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Chọn ảnh khác
                  </button>
                </>
              ) : (
                <UploadDropzone onFile={handlePhoto} disabled={false} />
              )}
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap items-center gap-5 rounded-2xl border border-border/60 bg-secondary/30 px-5 py-5">
                <ScopeFrame size={88} ringColor="var(--color-teal-deep)" interiorClassName="bg-ink-raised">
                  {photoPreview && (
                    // eslint-disable-next-line @next/next/no-img-element -- local blob: preview
                    <img src={photoPreview} alt="Ảnh đáy mắt" className="h-full w-full object-cover" />
                  )}
                </ScopeFrame>
                <div className="min-w-0">
                  <p className="text-base font-semibold text-foreground">{patient.fullName || "Chưa nhập tên"}</p>
                  <p className="text-sm text-muted-foreground">
                    {patient.phone || "Chưa có SĐT"} · {patient.dateOfBirth || "Chưa có ngày sinh"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                <SummaryField icon={UserRound} label="Giới tính" value={patient.gender ? GENDER_LABEL[patient.gender] : ""} />
                <SummaryField icon={Phone} label="Số điện thoại" value={patient.phone} />
                <SummaryField icon={IdCard} label="Số CCCD/CMND" value={patient.nationalId} />
                <SummaryField icon={Droplet} label="Nhóm máu" value={patient.bloodType} />
                <SummaryField icon={Briefcase} label="Nghề nghiệp" value={patient.occupation} />
                <SummaryField icon={MapPin} label="Địa chỉ" value={patient.address} />
                <SummaryField
                  icon={Contact}
                  label="Liên hệ khẩn cấp"
                  value={[patient.emergencyContactName, patient.emergencyContactPhone].filter(Boolean).join(" · ")}
                />
                <SummaryField icon={Calendar} label="Thời gian mắc tiểu đường" value={clinical.diabetesDurationYears ? `${clinical.diabetesDurationYears} năm` : ""} />
                <SummaryField icon={HeartPulse} label="HbA1c" value={clinical.hba1c ? `${clinical.hba1c}%` : ""} />
                <SummaryField icon={HeartPulse} label="Huyết áp" value={clinical.bloodPressure} />
              </div>

              <div className="flex items-center gap-2 rounded-lg bg-gold/10 px-3.5 py-2.5 text-sm text-gold-deep">
                <Sparkles className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                Ảnh sẽ được đưa vào sàng lọc AI ngay khi tạo, giống một ca khám thông thường.
              </div>

              {/* Opt-in, off by default -- multi-disease is experimental
                  (~62% val accuracy) and must never run silently just
                  because a photo happens to be on hand. Reuses this same
                  photo (no second upload) if checked, same scan-reuse
                  policy as the patient-facing "Sàng lọc thêm các bệnh
                  khác" button on /results/[imageId]. */}
              <label className="flex items-start gap-3 rounded-lg border border-dashed border-gold-deep/40 bg-gold/5 px-3.5 py-3 text-sm">
                <input
                  type="checkbox"
                  checked={alsoScreenMultidisease}
                  onChange={(e) => setAlsoScreenMultidisease(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-gold-deep"
                />
                <span>
                  <span className="flex items-center gap-1.5 font-medium text-gold-deep">
                    <Microscope className="h-3.5 w-3.5" strokeWidth={1.75} />
                    Đồng thời sàng lọc đa bệnh (thử nghiệm)
                  </span>
                  <span className="mt-0.5 block text-muted-foreground">
                    Chạy thêm mô hình phân loại 8 nhóm bệnh trên cùng ảnh này -- kết quả hiển thị riêng trên trang ca khám,
                    không thay thế chẩn đoán võng mạc.
                  </span>
                </span>
              </label>

              {submitError && <FormMessage kind="error">{submitError}</FormMessage>}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-between border-t border-border pt-6">
        <Button type="button" variant="outline" onClick={goBack} disabled={step === 0 || submitting}>
          <ChevronLeft className="h-4 w-4" data-icon="inline-start" />
          Quay lại
        </Button>

        {step < STEPS.length - 1 ? (
          <Button type="button" onClick={goNext} disabled={!canGoNext} className="glossy shadow-bubble">
            Tiếp theo
            <ChevronRight className="h-4 w-4" data-icon="inline-end" />
          </Button>
        ) : (
          <Button type="button" onClick={handleSubmit} disabled={submitting} className="glossy shadow-bubble">
            <FilePlus2 className="h-4 w-4" data-icon="inline-start" />
            {submitting ? "Đang tạo..." : "Tạo ca khám"}
          </Button>
        )}
      </div>
    </div>
  );
}
