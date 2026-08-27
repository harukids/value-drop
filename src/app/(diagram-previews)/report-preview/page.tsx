"use client";

import { DemoChrome } from "@/components/DemoChrome";
import { TeamReportView } from "@/components/TeamReportView";
import { getReportDemo } from "@/lib/diagram-demo";

export default function ReportPreviewPage() {
  const report = getReportDemo();
  return (
    <DemoChrome
      compact
      title="チームレポート見本"
      note="ホストが贈るお土産の見本です。部屋には入りません。"
    >
      <TeamReportView report={report} demo />
    </DemoChrome>
  );
}
