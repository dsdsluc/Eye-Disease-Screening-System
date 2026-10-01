import type { Metadata } from "next";
import { Be_Vietnam_Pro, IBM_Plex_Sans, IBM_Plex_Sans_Condensed, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/toast";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

// Softer, warmer voice for the marketing/landing page -- designed with full
// Vietnamese diacritic support, distinct from the app's more technical Plex
// system (which stays as-is for the dark "instrument panel" screens).
const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
});

const plexCondensed = IBM_Plex_Sans_Condensed({
  variable: "--font-plex-condensed",
  subsets: ["latin", "vietnamese"],
  weight: ["500", "600"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Fundas — Đọc ảnh đáy mắt hỗ trợ bởi AI",
  description: "Chấm điểm mức độ bệnh võng mạc tiểu đường từ ảnh đáy mắt bằng ensemble AI, kèm diễn giải hỗ trợ bác sĩ.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${plexSans.variable} ${plexCondensed.variable} ${plexMono.variable} ${beVietnamPro.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <AuthProvider>{children}</AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
