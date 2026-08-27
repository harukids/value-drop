"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { TeamReportView } from "@/components/TeamReportView";
import type { TeamReportPayload } from "@/lib/team-report";

export default function TeamReportPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [report, setReport] = useState<TeamReportPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const res = await fetch(`/api/reports/${id}`);
        const data = (await res.json()) as TeamReportPayload & { error?: string };
        if (!res.ok) throw new Error(data.error || "読み込みに失敗しました");
        if (!cancelled) {
          setReport(data);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setReport(null);
          setError(e instanceof Error ? e.message : "読み込みに失敗しました");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <main className="relative z-[1] mx-auto flex max-w-lg flex-1 items-center justify-center p-8 text-muted">
        読み込み中…
      </main>
    );
  }

  if (!report) {
    return (
      <main className="relative z-[1] mx-auto max-w-lg space-y-4 p-8">
        <p className="text-[#f0a0a0]">{error ?? "レポートがありません"}</p>
        <Link href="/" className="text-mint underline">
          トップへ
        </Link>
      </main>
    );
  }

  return (
    <main className="relative z-[1] mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-8 sm:gap-6 sm:py-10">
      <TeamReportView report={report} />
    </main>
  );
}
