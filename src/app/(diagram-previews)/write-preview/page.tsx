"use client";

import { DemoChrome } from "@/components/DemoChrome";
import { EndgameView } from "@/components/EndgameView";
import { getWriteDemo } from "@/lib/diagram-demo";

export default function WritePreviewPage() {
  const { room, players, me } = getWriteDemo();
  return (
    <DemoChrome
      title="理由見本"
      note="選んだ3枚への短い言葉です。送っても部屋には入りません。"
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
