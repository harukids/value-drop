"use client";

import { DemoChrome } from "@/components/DemoChrome";
import { EndgameView } from "@/components/EndgameView";
import { getSelectDemo } from "@/lib/diagram-demo";

export default function SelectPreviewPage() {
  const { room, players, me } = getSelectDemo();
  return (
    <DemoChrome
      title="選定見本"
      note="あかりの手札からメイン1枚・サブ2枚。図解と同じ愛／創造・探究です。"
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
