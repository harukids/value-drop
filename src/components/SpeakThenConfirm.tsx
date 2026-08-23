"use client";

type SpeakBannerProps = {
  script: string;
};

export function SpeakBanner({ script }: SpeakBannerProps) {
  return (
    <div className="rounded-xl border border-mint/40 bg-mint/10 px-3 py-2.5">
      <p className="text-[11px] font-semibold tracking-wide text-mint">
        声に出してから確定
      </p>
      <p className="mt-1 text-sm font-bold leading-snug text-[#e8fff8]">
        {script}
      </p>
    </div>
  );
}

type SpeakConfirmSheetProps = {
  script: string;
  actionLabel: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function SpeakConfirmSheet({
  script,
  actionLabel,
  busy,
  onCancel,
  onConfirm,
}: SpeakConfirmSheetProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-sm space-y-4 rounded-2xl border border-line bg-[#12162a] p-5 shadow-xl"
      >
        <p className="text-xs font-semibold tracking-wide text-mint">
          ZoomでもOK · 声に出してから
        </p>
        <p className="text-center text-xl font-bold leading-relaxed text-[#f4f7ff]">
          {script}
        </p>
        <p className="text-center text-xs text-muted">
          言い終わったら下のボタンを押してください
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={busy}
            className="rounded-xl border border-line px-3 py-3 text-sm disabled:opacity-40"
            onClick={onCancel}
          >
            もどる
          </button>
          <button
            type="button"
            disabled={busy}
            className="rounded-xl bg-gradient-to-r from-[#6ea8ff] via-[#ff8ec8] to-[#ffb086] px-3 py-3 text-sm font-bold text-[#12122a] disabled:opacity-40"
            onClick={onConfirm}
          >
            {busy ? "処理中…" : actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function speakReleaseScript(label: string) {
  return `私は「${label}」を手放します`;
}

export function speakGainScript(label: string) {
  return `私は「${label}」を手に入れます`;
}
