"use client";

import { useEffect, useState } from "react";

const BGM_SRC = "/bgm/entry.m4a";
const BGM_VOLUME = 0.3;
/** 画面遷移で一瞬アンマウントされてもつながる猶予 */
const REMOUNT_GRACE_MS = 400;
/** 本停止時のフェードアウト長 */
const FADE_OUT_MS = 1400;

type SharedBgm = {
  audio: HTMLAudioElement | null;
  started: boolean;
  muted: boolean;
  refCount: number;
  stopTimer: ReturnType<typeof setTimeout> | null;
  fadeTimer: ReturnType<typeof setInterval> | null;
  interactBound: boolean;
};

let shared: SharedBgm | null = null;

function clearFade(bag: SharedBgm) {
  if (bag.fadeTimer) {
    clearInterval(bag.fadeTimer);
    bag.fadeTimer = null;
  }
}

function restoreVolume(bag: SharedBgm) {
  clearFade(bag);
  if (bag.audio) bag.audio.volume = BGM_VOLUME;
}

function destroyShared() {
  if (!shared) return;
  clearFade(shared);
  if (shared.stopTimer) {
    clearTimeout(shared.stopTimer);
    shared.stopTimer = null;
  }
  window.removeEventListener("pointerdown", onGlobalInteract);
  window.removeEventListener("keydown", onGlobalInteract);
  if (shared.audio) {
    shared.audio.pause();
    shared.audio.removeAttribute("src");
    shared.audio.load();
  }
  shared = null;
}

function fadeOutAndDestroy(bag: SharedBgm) {
  clearFade(bag);
  if (!bag.audio || bag.muted || bag.audio.paused || !bag.started) {
    destroyShared();
    return;
  }

  const startVol = bag.audio.volume;
  const startedAt = performance.now();
  bag.fadeTimer = setInterval(() => {
    if (!shared || shared !== bag || shared.refCount > 0 || !bag.audio) {
      clearFade(bag);
      return;
    }
    const t = Math.min(1, (performance.now() - startedAt) / FADE_OUT_MS);
    bag.audio.volume = startVol * (1 - t);
    if (t >= 1) {
      clearFade(bag);
      destroyShared();
    }
  }, 40);
}

/** 再生する瞬間まで m4a を取りに行かない */
function ensureAudio(bag: SharedBgm): HTMLAudioElement {
  if (!bag.audio) {
    const audio = new Audio();
    audio.preload = "none";
    audio.loop = true;
    audio.volume = BGM_VOLUME;
    audio.muted = bag.muted;
    bag.audio = audio;
  }
  if (!bag.audio.src) {
    bag.audio.src = BGM_SRC;
  }
  return bag.audio;
}

function startPlayback(bag: SharedBgm) {
  if (bag.started) return;
  bag.started = true;
  const audio = ensureAudio(bag);
  audio.muted = bag.muted;
  audio.volume = BGM_VOLUME;
  void audio.play().catch(() => {
    if (shared) shared.started = false;
  });
}

function acquireShared(): SharedBgm {
  if (!shared) {
    shared = {
      audio: null,
      started: false,
      muted: false,
      refCount: 0,
      stopTimer: null,
      fadeTimer: null,
      interactBound: false,
    };
  }
  if (shared.stopTimer) {
    clearTimeout(shared.stopTimer);
    shared.stopTimer = null;
  }
  restoreVolume(shared);
  shared.refCount += 1;
  return shared;
}

function releaseAudio() {
  if (!shared) return;
  shared.refCount -= 1;
  if (shared.refCount > 0) return;

  const current = shared;
  current.stopTimer = setTimeout(() => {
    if (!shared || shared.refCount > 0) return;
    fadeOutAndDestroy(shared);
  }, REMOUNT_GRACE_MS);
}

function onGlobalInteract(e: Event) {
  if (!shared || shared.started) return;
  const target = e.target;
  if (target instanceof Element && target.closest("[data-bgm-control]")) {
    return;
  }
  startPlayback(shared);
}

/**
 * ホーム／ホスト／入室前／ロビー用。
 * 最初の操作で再生、ミュート可（画面をまたいでもシングルトンで継続）。
 * プレイ開始などで全インスタンスが外れるとフェードアウトして停止。
 * 音ファイルは操作があるまで取得しない。
 */
export function EntryBgm() {
  const [muted, setMuted] = useState(false);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    const bag = acquireShared();
    setMuted(bag.muted);
    setArmed(bag.started);

    if (!bag.interactBound) {
      window.addEventListener("pointerdown", onGlobalInteract);
      window.addEventListener("keydown", onGlobalInteract);
      bag.interactBound = true;
    }

    const syncArmed = () => setArmed(Boolean(shared?.started));
    const id = window.setInterval(syncArmed, 400);

    return () => {
      window.clearInterval(id);
      releaseAudio();
    };
  }, []);

  return (
    <div
      data-bgm-control
      className="pointer-events-none fixed bottom-4 right-4 z-40 flex flex-col items-end gap-1.5"
    >
      <button
        type="button"
        className="pointer-events-auto rounded-full border border-line bg-panel/95 px-3.5 py-2 text-sm font-semibold text-foreground shadow-lg backdrop-blur-md"
        aria-pressed={muted}
        aria-label={muted ? "BGMをオンにする" : "BGMをミュートする"}
        onClick={() => {
          if (!shared) return;
          if (!shared.started) {
            startPlayback(shared);
            setArmed(true);
            return;
          }
          const next = !shared.muted;
          shared.muted = next;
          if (shared.audio) shared.audio.muted = next;
          setMuted(next);
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
