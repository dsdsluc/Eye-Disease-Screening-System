"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Lock } from "lucide-react";

import { PasswordField } from "@/components/password-field";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";

/** /account's password-change card. Self-contained like ProfileForm --
 * owns its own draft state and clears the fields itself on success. */
export function PasswordForm({
  onSave,
  className,
}: {
  onSave: (currentPassword: string, newPassword: string) => Promise<void>;
  className?: string;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (newPassword.length < 8) {
      setMessage({ kind: "error", text: "Mật khẩu mới phải có ít nhất 8 ký tự." });
      return;
    }
    setSaving(true);
    try {
      await onSave(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setMessage({ kind: "ok", text: "Đã đổi mật khẩu." });
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Không đổi được mật khẩu." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.08 }}
      onSubmit={handleSubmit}
      className={className ?? "glossy shadow-bubble flex flex-col gap-5 rounded-2xl border border-border bg-card px-6 py-6"}
    >
      <div className="flex items-center gap-2.5">
        <Lock className="h-4 w-4 text-gold-deep" strokeWidth={1.75} />
        <h2 className="text-base font-semibold text-foreground">Đổi mật khẩu</h2>
      </div>

      <PasswordField
        id="currentPassword"
        label="Mật khẩu hiện tại"
        value={currentPassword}
        onChange={setCurrentPassword}
        autoComplete="current-password"
        icon={false}
      />

      <PasswordField
        id="newPassword"
        label="Mật khẩu mới"
        value={newPassword}
        onChange={setNewPassword}
        autoComplete="new-password"
        placeholder="Ít nhất 8 ký tự"
        minLength={8}
        icon={false}
      />

      {message && <FormMessage kind={message.kind}>{message.text}</FormMessage>}

      <Button type="submit" disabled={saving} variant="outline" className="w-fit rounded-full">
        {saving ? "Đang đổi…" : "Đổi mật khẩu"}
      </Button>
    </motion.form>
  );
}
