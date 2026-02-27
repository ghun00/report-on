import type { Metadata } from "next";
import "./globals.css";
import { ReportsProvider } from "@/contexts/reports-context";
import ChromeBanner from "@/components/chrome-banner";

export const metadata: Metadata = {
  metadataBase: new URL("https://report-on.app"),
  title: "레포트온 | AI 컨설턴트 상담 보고서 생성 에이전트",
  description: "상담 녹음만 하세요. 전문적인 보고서는 레포트온이 만들어드릴게요.",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "레포트온 | AI 컨설턴트 상담 보고서 생성 에이전트",
    description: "상담 녹음만 하세요. 전문적인 보고서는 레포트온이 만들어드릴게요.",
    url: "https://report-on.app",
    siteName: "레포트온",
    images: [
      {
        url: "/meta_img.png",
        width: 1200,
        height: 630,
        alt: "레포트온 | AI 컨설턴트 상담 보고서 생성 에이전트",
      },
    ],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "레포트온 | AI 컨설턴트 상담 보고서 생성 에이전트",
    description: "상담 녹음만 하세요. 전문적인 보고서는 레포트온이 만들어드릴게요.",
    images: ["/meta_img.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        <ChromeBanner />
        <ReportsProvider>{children}</ReportsProvider>
      </body>
    </html>
  );
}
