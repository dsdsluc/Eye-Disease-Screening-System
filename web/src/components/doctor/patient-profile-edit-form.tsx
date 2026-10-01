"use client";

import { useState } from "react";
import { Save, X } from "lucide-react";

import { GENDER_OPTIONS, BLOOD_TYPE_OPTIONS } from "@/lib/patient";
import { type PatientProfile, type PatientProfileInput, updatePatientProfile } from "@/lib/doctor";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";

const inputClass =
  "h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
const textareaClass =
  "w-full resize-none rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
const labelClass = "text-sm font-medium text-foreground";

function draftFrom(patient: PatientProfile): PatientProfileInput {
  return {
    fullName: patient.fullName,
    phone: patient.phone ?? "",
    dateOfBirth: patient.dateOfBirth ? patient.dateOfBirth.slice(0, 10) : "",
    gender: patient.gender ?? "",
    nationalId: patient.nationalId ?? "",
    address: patient.address ?? "",
    occupation: patient.occupation ?? "",
    bloodType: patient.bloodType ?? "",
    emergencyContactName: patient.emergencyContactName ?? "",
    emergencyContactPhone: patient.emergencyContactPhone ?? "",
    medicalHistory: patient.medicalHistory ?? "",
    insuranceNumber: patient.insuranceNumber ?? "",
  };
}

/** Edit form for PatientProfileCard -- the one gap "Ca mới" left open: that
 * wizard can only CREATE these intake fields at walk-in time, with no way
 * to fix a typo or fill in what was skipped afterward. Same plain-form
 * (not inline-editable) shape as DoctorProfileEditForm, same field set as
 * PatientProfileCard one for one -- email is deliberately NOT here, same
 * reasoning PATCH /api/doctor/patients/[id] documents (account identity,
 * not intake data). */
export function PatientProfileEditForm({
  patient,
  onSaved,
  onCancel,
}: {
  patient: PatientProfile;
  onSaved: (patient: PatientProfile) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<PatientProfileInput>(() => draftFrom(patient));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function patch(key: keyof PatientProfileInput, value: string) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updated = await updatePatientProfile(patient.id, draft);
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được hồ sơ bệnh nhân.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="glossy shadow-bubble flex flex-col gap-7 rounded-[1.75rem] border border-border/60 bg-card px-8 py-8 sm:px-10 sm:py-10"
    >
      <h2 className="text-lg font-semibold text-foreground">Chỉnh sửa hồ sơ bệnh nhân</h2>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Họ và tên *</label>
          <input value={draft.fullName} onChange={(e) => patch("fullName", e.target.value)} className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Số điện thoại</label>
          <input value={draft.phone} onChange={(e) => patch("phone", e.target.value)} className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Ngày sinh</label>
          <input
            type="date"
            value={draft.dateOfBirth}
            onChange={(e) => patch("dateOfBirth", e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Giới tính</label>
          <select value={draft.gender} onChange={(e) => patch("gender", e.target.value)} className={inputClass}>
            <option value="">Không muốn nêu</option>
            {GENDER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Số CCCD/CMND</label>
          <input value={draft.nationalId} onChange={(e) => patch("nationalId", e.target.value)} className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Nhóm máu</label>
          <select value={draft.bloodType} onChange={(e) => patch("bloodType", e.target.value)} className={inputClass}>
            <option value="">Chưa rõ</option>
            {BLOOD_TYPE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Nghề nghiệp</label>
          <input value={draft.occupation} onChange={(e) => patch("occupation", e.target.value)} className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Số bảo hiểm y tế</label>
          <input
            value={draft.insuranceNumber}
            onChange={(e) => patch("insuranceNumber", e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Người liên hệ khẩn cấp</label>
          <input
            value={draft.emergencyContactName}
            onChange={(e) => patch("emergencyContactName", e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>SĐT liên hệ khẩn cấp</label>
          <input
            value={draft.emergencyContactPhone}
            onChange={(e) => patch("emergencyContactPhone", e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Địa chỉ thường trú</label>
        <textarea
          value={draft.address}
          onChange={(e) => patch("address", e.target.value)}
          rows={2}
          className={textareaClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Tiền sử bệnh / Dị ứng</label>
        <textarea
          value={draft.medicalHistory}
          onChange={(e) => patch("medicalHistory", e.target.value)}
          rows={3}
          placeholder="Bệnh nền, thuốc đang dùng, dị ứng đã biết..."
          className={textareaClass}
        />
      </div>

      {error && <FormMessage kind="error">{error}</FormMessage>}

      <div className="flex items-center justify-end gap-3 border-t border-border pt-6">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" strokeWidth={1.75} />
          Hủy
        </button>
        <Button type="submit" disabled={saving} className="glossy shadow-bubble">
          <Save className="h-4 w-4" data-icon="inline-start" />
          {saving ? "Đang lưu..." : "Lưu hồ sơ"}
        </Button>
      </div>
    </form>
  );
}
