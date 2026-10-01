"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { User } from "lucide-react";

import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import type { AuthUser, ProfileUpdate } from "@/lib/account";
import { GENDER_OPTIONS } from "@/lib/patient";

const inputClass =
  "h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

/** /account's identity card. Owns its own draft state (name/phone/dob/
 * gender) and diffs against `user` to decide whether there's anything to
 * save -- the page just hands it the current user and a save function. */
export function ProfileForm({
  user,
  onSave,
  className,
}: {
  user: AuthUser;
  onSave: (profile: ProfileUpdate) => Promise<void>;
  className?: string;
}) {
  const [fullNameDraft, setFullNameDraft] = useState<string | null>(null);
  const [phoneDraft, setPhoneDraft] = useState<string | null>(null);
  const [dateOfBirthDraft, setDateOfBirthDraft] = useState<string | null>(null);
  const [genderDraft, setGenderDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const fullName = fullNameDraft ?? user.fullName;
  const phone = phoneDraft ?? user.phone ?? "";
  // Server sends a full ISO datetime; a date input wants just the date part.
  const dateOfBirth = dateOfBirthDraft ?? user.dateOfBirth?.slice(0, 10) ?? "";
  const gender = genderDraft ?? user.gender ?? "";

  const unchanged =
    fullName.trim() === user.fullName &&
    phone.trim() === (user.phone ?? "") &&
    dateOfBirth === (user.dateOfBirth?.slice(0, 10) ?? "") &&
    gender === (user.gender ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setSaving(true);
    try {
      await onSave({ fullName: fullName.trim(), phone: phone.trim(), dateOfBirth, gender });
      setMessage({ kind: "ok", text: "Đã lưu hồ sơ." });
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Không lưu được." });
    } finally {
      setSaving(false);
    }
  }

  // No confirmation dialog -- this only clears local drafts back to `user`,
  // nothing has been sent to the server yet, so there's nothing destructive
  // to guard against.
  function handleDiscard() {
    setFullNameDraft(null);
    setPhoneDraft(null);
    setDateOfBirthDraft(null);
    setGenderDraft(null);
    setMessage(null);
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      onSubmit={handleSubmit}
      className={className ?? "glossy shadow-bubble flex flex-col gap-5 rounded-2xl border border-border bg-card px-6 py-6"}
    >
      <div className="flex items-center gap-2.5">
        <User className="h-4 w-4 text-gold-deep" strokeWidth={1.75} />
        <h2 className="text-base font-semibold text-foreground">Hồ sơ</h2>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Email</label>
          <p className="flex h-11 items-center text-sm text-muted-foreground">{user.email}</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="fullName" className="text-sm font-medium text-foreground">
            Họ và tên
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullNameDraft(e.target.value)}
            required
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="phone" className="text-sm font-medium text-foreground">
            Số điện thoại
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhoneDraft(e.target.value)}
            placeholder="09xx xxx xxx"
            autoComplete="tel"
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="dateOfBirth" className="text-sm font-medium text-foreground">
            Ngày sinh
          </label>
          <input
            id="dateOfBirth"
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirthDraft(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="gender" className="text-sm font-medium text-foreground">
            Giới tính
          </label>
          <select id="gender" value={gender} onChange={(e) => setGenderDraft(e.target.value)} className={inputClass}>
            <option value="">Không muốn nêu</option>
            {GENDER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {message && <FormMessage kind={message.kind}>{message.text}</FormMessage>}

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={saving || fullName.trim() === "" || unchanged}
          className="glossy shadow-bubble w-fit rounded-full"
        >
          {saving ? "Đang lưu…" : "Lưu thay đổi"}
        </Button>
        {/* Only worth showing once there's actually a draft to throw away --
            otherwise it's a button that does nothing. */}
        {!unchanged && (
          <button
            type="button"
            onClick={handleDiscard}
            disabled={saving}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Hủy thay đổi
          </button>
        )}
      </div>
    </motion.form>
  );
}
