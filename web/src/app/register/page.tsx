"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowRight, Mail, ShieldCheck, User } from "lucide-react";

import { AuthShell } from "@/components/auth/auth-shell";
import { IconTextField } from "@/components/icon-text-field";
import { PasswordField } from "@/components/password-field";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
};

const TRUST_PILLS = ["Không lưu trữ công khai", "Chỉ bạn mới xem được kết quả", "Mã hoá đầu-cuối"];

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Mật khẩu phải có ít nhất 8 ký tự.");
      return;
    }
    setSubmitting(true);
    try {
      await register(email, fullName, password);
      router.push("/history");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng ký thất bại.");
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Fundas · Sổ khám bệnh cá nhân"
      title="Tạo tài khoản, bắt đầu theo dõi đôi mắt của bạn."
      description="Mỗi lần sàng lọc sẽ được lưu lại thành một cuốn sổ khám bệnh thu nhỏ, giúp bạn thấy rõ diễn tiến qua từng lần chụp."
      trustPills={TRUST_PILLS}
    >
      <motion.div
        initial="hidden"
        animate="show"
        transition={{ staggerChildren: 0.1, delayChildren: 0.2 }}
        className="mx-auto w-full max-w-sm"
      >
        <motion.div variants={fadeUp} transition={{ duration: 0.5 }} className="mb-9">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">Đăng ký</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Tạo tài khoản bằng email — chỉ mất chưa đầy một phút.</p>
        </motion.div>

        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <motion.div variants={fadeUp} transition={{ duration: 0.5 }}>
            <IconTextField
              id="fullName"
              label="Họ và tên"
              icon={User}
              value={fullName}
              onChange={setFullName}
              placeholder="Nguyễn Văn A"
              autoComplete="name"
            />
          </motion.div>

          <motion.div variants={fadeUp} transition={{ duration: 0.5 }}>
            <IconTextField
              id="email"
              label="Email"
              icon={Mail}
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="ban@vidu.com"
              autoComplete="email"
            />
          </motion.div>

          <motion.div variants={fadeUp} transition={{ duration: 0.5 }}>
            <PasswordField
              id="password"
              label="Mật khẩu"
              value={password}
              onChange={setPassword}
              placeholder="Ít nhất 8 ký tự"
              autoComplete="new-password"
              minLength={8}
            />
          </motion.div>

          {error && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
              <FormMessage kind="error" className="rounded-lg bg-destructive/10 px-3 py-2.5">
                {error}
              </FormMessage>
            </motion.div>
          )}

          <motion.div variants={fadeUp} transition={{ duration: 0.5 }}>
            <Button
              type="submit"
              size="lg"
              disabled={submitting}
              className="glossy shadow-bubble group mt-1 h-12 w-full rounded-full text-base transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {submitting ? "Đang tạo tài khoản…" : "Tạo tài khoản"}
              {!submitting && (
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" data-icon="inline-end" />
              )}
            </Button>
          </motion.div>
        </form>

        <motion.div
          variants={fadeUp}
          transition={{ duration: 0.5 }}
          initial="hidden"
          animate="show"
          className="mt-8 flex items-center gap-3 text-xs text-muted-foreground/80"
        >
          <ShieldCheck className="h-4 w-4 shrink-0 text-teal-deep" />
          <p className="leading-relaxed">Dữ liệu ảnh và kết quả chẩn đoán chỉ hiển thị cho tài khoản đã xác thực.</p>
        </motion.div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Đã có tài khoản?{" "}
          <Link href="/login" className="font-medium text-teal-deep hover:underline">
            Đăng nhập
          </Link>
        </p>
      </motion.div>
    </AuthShell>
  );
}
