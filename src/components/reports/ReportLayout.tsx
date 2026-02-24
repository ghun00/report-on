"use client";

import { ReactNode } from "react";

interface ReportLayoutProps {
  transcriptPanel: ReactNode;
  reportMain: ReactNode;
  toc: ReactNode;
}

export default function ReportLayout({
  transcriptPanel,
  reportMain,
  toc,
}: ReportLayoutProps) {
  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 xl:gap-12 justify-center">
      {transcriptPanel}
      {reportMain}
      {toc}
    </div>
  );
}
