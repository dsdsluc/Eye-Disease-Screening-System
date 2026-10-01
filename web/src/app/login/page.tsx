"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { ArrowRight, Mail, ShieldCheck } from "lucide-react";

import { AuthShell } from "@/components/auth/auth-shell";
import { IconTextField } from "@/components/icon-text-field";
import { PasswordField } from "@/components/password-field";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { routeForRole } from "@/lib/account";

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
};

const TRUST_PILLS = ["Không lưu trữ công khai", "Chỉ bác sĩ được duyệt truy cập", "Mã hoá đầu-cuối"];

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const loggedIn = await login(email, password);
      router.push(routeForRole(loggedIn.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại.");
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Fundas · Sổ khám bệnh cá nhân"
      title="Theo dõi từng lần sàng lọc, an tâm về đôi mắt của bạn."
      description="Đăng nhập để xem lại lịch sử ảnh đã chấm, diễn giải kết quả và theo dõi diễn tiến sức khoẻ đôi mắt của chính bạn qua từng lần khám."
      trustPills={TRUST_PILLS}
    >
      <motion.div
        initial="hidden"
        animate="show"
        transition={{ staggerChildren: 0.1, delayChildren: 0.2 }}
        className="mx-auto w-full max-w-sm"
      >
        <motion.div variants={fadeUp} transition={{ duration: 0.5 }} className="mb-9">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">Đăng nhập</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Nhập email và mật khẩu tài khoản của bạn.</p>
        </motion.div>

        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
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
              placeholder="••••••••"
              autoComplete="current-password"
              labelExtra={
                <Link href="/login" className="font-condensed text-[11px] uppercase tracking-wider text-teal-deep hover:underline">
                  Quên mật khẩu?
                </Link>
              }
            />
          </motion.div>

          <motion.label
            variants={fadeUp}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-2 text-sm text-muted-foreground select-none"
          >
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border text-teal-deep accent-(--color-teal-deep) focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            Ghi nhớ đăng nhập trên thiết bị này
          </motion.label>

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
              {submitting ? "Đang đăng nhập…" : "Đăng nhập"}
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
          Chưa có tài khoản?{" "}
          <Link href="/register" className="font-medium text-teal-deep hover:underline">
            Đăng ký
          </Link>
        </p>
      </motion.div>
    </AuthShell>
  );
}
