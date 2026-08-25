"use client";

import { useEffect, useRef, useState } from "react";

const BGM_SRC = "/bgm/entry.m4a";
const BGM_VOLUME = 0.3;

/**
 * トップ／入室前専用。最初の操作で再生開始、ミュート可（記憶しない）。
 * アンマウント（入室後）で停止。
 */
export function EntryBgm() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const startedRef = useRef(false);
  const mutedRef = useRef(false);
  const [muted, setMuted] = useState(false);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    mutedRef.current = muted;
    const audio = audioRef.current;
    if (audio) audio.muted = muted;
  }, [muted]);

  useEffect(() => {
    const audio = new Audio(BGM_SRC);
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = BGM_VOLUME;
    audio.muted = mutedRef.current;
    audioRef.current = audio;

    const tryStart = () => {
      if (startedRef.current) return;
      startedRef.current = true;
      setArmed(true);
      audio.muted = mutedRef.current;
      void audio.play().catch(() => {
        // 自動再生拒否など — 次の操作で再試行できるようフラグを戻す
        startedRef.current = false;
        setArmed(false);
      });
    };

    const onInteract = () => tryStart();
    window.addEventListener("pointerdown", onInteract);
    window.addEventListener("keydown", onInteract);

    return () => {
      window.removeEventListener("pointerdown", onInteract);
      window.removeEventListener("keydown", onInteract);
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      audioRef.current = null;
      startedRef.current = false;
    };
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-40 flex flex-col items-end gap-1.5">
      <button
        type="button"
        className="pointer-events-auto rounded-full border border-line bg-panel/95 px-3.5 py-2 text-sm font-semibold text-foreground shadow-lg backdrop-blur-md"
        aria-pressed={muted}
        aria-label={muted ? "BGMをオンにする" : "BGMをミュートする"}
        onClick={() => {
          setMuted((m) => {
            const next = !m;
            mutedRef.current = next;
            if (audioRef.current) audioRef.current.muted = next;
            return next;
          });
          const audio = audioRef.current;
          if (!audio || startedRef.current) return;
          startedRef.current = true;
          setArmed(true);
          void audio.play().catch(() => {
            startedRef.current = false;
            setArmed(false);
          });
        }}
      >
        {muted ? "♪ ミュート中" : armed ? "♪ BGM" : "♪ タップでBGM"}
      </button>
      <a
        href="http://bgmer.net"
        target="_blank"
        rel="noopener noreferrer"
        className="pointer-events-auto text-[10px] text-muted/90 underline-offset-2 hover:text-mint hover:underline"
      >
        音楽: BGMer
      </a>
    </div>
  );
}
