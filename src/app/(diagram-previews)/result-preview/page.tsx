"use client";

import { DemoChrome } from "@/components/DemoChrome";
import { EndgameView } from "@/components/EndgameView";
import { getResultDemo } from "@/lib/diagram-demo";

export default function ResultPreviewPage() {
  const { room, players, me } = getResultDemo();
  return (
    <DemoChrome
      title="結果見本（進行役）"
      note="席に座らない進行役の画面です。自分のポスターはなく、3人の言葉とチームレポートがあります。"
    >
      <EndgameView
        room={room}
        players={players}
        me={me}
        demo
        onChanged={async () => undefined}
      />
    </DemoChrome>
  );
}
