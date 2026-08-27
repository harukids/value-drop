"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DemoChrome } from "@/components/DemoChrome";
import { PlayingView } from "@/components/PlayingView";
import { getPlayConfirmDemo, type PlayView } from "@/lib/diagram-demo";

function PlayPreviewInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const raw = searchParams.get("view");
  const view: PlayView =
    raw === "sota" ? "sota" : raw === "host" ? "host" : "akari";
  const { room, players, me } = getPlayConfirmDemo(view);

  return (
    <DemoChrome
      title="プレイ見本"
      note={
        view === "host"
          ? "進行役の視点です。手札はなく、いま誰が操作しているかだけ見えます。"
          : "同じ手番の2視点です。あかりにはまだ裏、そうたには表と OK／ダメ。"
      }
      extra={
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            className={`rounded-xl px-3 py-1.5 text-sm font-semibold ${
              view === "akari"
                ? "bg-accent text-[#16382f]"
                : "border border-line text-muted"
            }`}
            onClick={() => router.replace("/play-preview?view=akari")}
          >
            あかりの視点
          </button>
          <button
            type="button"
            className={`rounded-xl px-3 py-1.5 text-sm font-semibold ${
              view === "sota"
                ? "bg-accent text-[#16382f]"
                : "border border-line text-muted"
            }`}
            onClick={() => router.replace("/play-preview?view=sota")}
          >
            そうたの視点
          </button>
          <button
            type="button"
            className={`rounded-xl px-3 py-1.5 text-sm font-semibold ${
              view === "host"
                ? "bg-accent text-[#16382f]"
                : "border border-line text-muted"
            }`}
            onClick={() => router.replace("/play-preview?view=host")}
          >
            進行役の視点
          </button>
        </div>
      }
    >
      <PlayingView
        key={view}
        room={room}
        players={players}
        me={me}
        demo
        onChanged={async () => undefined}
      />
    </DemoChrome>
  );
}

export default function PlayPreviewPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex max-w-2xl flex-1 items-center justify-center p-8 text-muted">
          読み込み中…
        </main>
      }
    >
      <PlayPreviewInner />
    </Suspense>
  );
}
