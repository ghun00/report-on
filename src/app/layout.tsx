import type { Metadata } from "next";
import "./globals.css";
import { ReportsProvider } from "@/contexts/reports-context";

export const metadata: Metadata = {
  title: "상담 보고서",
  description: "상담 녹음 → 상담 보고서 → 공유",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        <ReportsProvider>{children}</ReportsProvider>
      </body>
    </html>
  );
}
