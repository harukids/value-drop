"use client";

import { DemoChrome } from "@/components/DemoChrome";
import { EndgameView } from "@/components/EndgameView";
import { getResultDemo } from "@/lib/diagram-demo";

export default function ResultPreviewPage() {
  const { room, players, me } = getResultDemo();
  return (
    <DemoChrome
      title="結果見本（ホスト）"
      note="ワーク後のホスト画面です。3人の言葉が一覧になり、ポスター保存とチームレポートが同じ場所にあります。"
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
