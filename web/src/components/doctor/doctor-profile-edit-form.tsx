"use client";

import { useState } from "react";
import { Save, X } from "lucide-react";

import { type DoctorProfile, type DoctorProfileInput, updateDoctorProfile } from "@/lib/doctor";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";

const inputClass =
  "h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
const textareaClass =
  "w-full resize-none rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
const labelClass = "text-sm font-medium text-foreground";

function draftFrom(doctor: DoctorProfile): DoctorProfileInput {
  return {
    fullName: doctor.fullName,
    title: doctor.title ?? "",
    specialty: doctor.specialty ?? "",
    licenseNumber: doctor.licenseNumber ?? "",
    hospital: doctor.hospital ?? "",
    yearsOfExperience: doctor.yearsOfExperience !== null ? String(doctor.yearsOfExperience) : "",
    phone: doctor.phone ?? "",
    education: doctor.education ?? "",
    bio: doctor.bio ?? "",
    avatarUrl: doctor.avatarUrl ?? "",
  };
}

/** Edit form for DoctorProfileCard -- a plain form, not an inline-editable
 * card, so there's a clear "còn nháp, chưa lưu" vs. "đã lưu" boundary (Lưu/
 * Hủy) instead of every field auto-saving on blur. PATCH /api/doctor/profile
 * always updates the CALLER's own row (no id param), so this can only ever
 * be shown to the doctor viewing their own profile -- see doctor-profile-
 * view.tsx's canEdit check. */
export function DoctorProfileEditForm({
  doctor,
  onSaved,
  onCancel,
}: {
  doctor: DoctorProfile;
  onSaved: (doctor: DoctorProfile) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<DoctorProfileInput>(() => draftFrom(doctor));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function patch(key: keyof DoctorProfileInput, value: string) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updated = await updateDoctorProfile(draft);
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được hồ sơ bác sĩ.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="glossy shadow-bubble flex flex-col gap-7 rounded-[1.75rem] border border-border/60 bg-card px-8 py-8 sm:px-10 sm:py-10"
    >
      <h2 className="text-lg font-semibold text-foreground">Chỉnh sửa hồ sơ bác sĩ</h2>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Họ và tên *</label>
          <input value={draft.fullName} onChange={(e) => patch("fullName", e.target.value)} className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Chức danh</label>
          <input
            value={draft.title}
            onChange={(e) => patch("title", e.target.value)}
            placeholder="VD: ThS.BS."
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Chuyên khoa</label>
          <input value={draft.specialty} onChange={(e) => patch("specialty", e.target.value)} className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Số chứng chỉ hành nghề</label>
          <input
            value={draft.licenseNumber}
            onChange={(e) => patch("licenseNumber", e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Nơi công tác</label>
          <input value={draft.hospital} onChange={(e) => patch("hospital", e.target.value)} className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Số năm kinh nghiệm</label>
          <input
            type="number"
            min={0}
            value={draft.yearsOfExperience}
            onChange={(e) => patch("yearsOfExperience", e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Số điện thoại</label>
          <input value={draft.phone} onChange={(e) => patch("phone", e.target.value)} className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Ảnh đại diện (URL)</label>
          <input
            value={draft.avatarUrl}
            onChange={(e) => patch("avatarUrl", e.target.value)}
            placeholder="https://..."
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Học vấn (mỗi dòng một bằng cấp)</label>
        <textarea
          value={draft.education}
          onChange={(e) => patch("education", e.target.value)}
          rows={4}
          placeholder={"Bác sĩ Đa khoa - Đại học Y Hà Nội (2010)\nThạc sĩ Nhãn khoa - Đại học Y Hà Nội (2014)"}
          className={textareaClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Giới thiệu</label>
        <textarea
          value={draft.bio}
          onChange={(e) => patch("bio", e.target.value)}
          rows={4}
          placeholder="Vài dòng giới thiệu kinh nghiệm, thế mạnh chuyên môn..."
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
