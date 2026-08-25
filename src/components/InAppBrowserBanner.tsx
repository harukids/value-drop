"use client";

import { useEffect, useState } from "react";
import {
  detectInAppBrowser,
  inAppOpenSteps,
  type InAppBrowserInfo,
} from "@/lib/in-app-browser";

type Props = {
  /** entry: 入室前の強い案内 / result: 結果の弱い注記 */
  variant: "entry" | "result";
  /** コピーするURL（省略時は現在のページ） */
  url?: string;
};

export function useInAppBrowser(): InAppBrowserInfo | null {
  const [info, setInfo] = useState<InAppBrowserInfo | null>(null);
  useEffect(() => {
    setInfo(detectInAppBrowser());
  }, []);
  return info;
}

export function InAppBrowserBanner({ variant, url }: Props) {
  const info = useInAppBrowser();
  const [copied, setCopied] = useState(false);

  if (!info?.isInApp) return null;

  async function copyUrl() {
    const target =
      url ?? (typeof window !== "undefined" ? window.location.href : "");
    if (!target) return;
    try {
      await navigator.clipboard.writeText(target);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore — 手動選択を促す文言はバナー内に既にある
    }
  }

  if (variant === "result") {
    return (
      <div
        className="rounded-2xl border border-line bg-panel px-4 py-3 text-sm text-muted"
        role="status"
      >
        いまのブラウザだと画像が保存できないことがあります。保存できないときは、ホストに共有してもらってください（この画面から別のブラウザへ移ると席が引き継がれません）。
      </div>
    );
  }

  const steps = inAppOpenSteps(info);
  const appLabel =
    info.kind === "line"
      ? "LINE"
      : info.kind === "instagram"
        ? "Instagram"
        : info.kind === "facebook"
          ? "Facebook"
          : info.kind === "twitter"
            ? "X（Twitter）"
            : "アプリ";

  return (
    <section
      className="space-y-3 rounded-2xl border-2 border-accent bg-panel p-4 shadow-[0_0_0_1px_rgba(255,154,213,0.28)]"
      role="status"
    >
      <div>
        <p className="text-sm font-bold text-accent">
          {appLabel}の中のブラウザで開いています
        </p>
        <p className="mt-1 text-sm text-muted leading-relaxed">
          このままだと、あとで画像の保存がうまくいかないことがあります。入室する前に、Safari
          や Chrome などスマホ本体のブラウザで開き直してください。
        </p>
      </div>
      <ol className="list-decimal space-y-1 pl-5 text-sm text-foreground">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <button
        type="button"
        onClick={() => void copyUrl()}
        className="w-full rounded-xl border border-line bg-background px-4 py-2.5 text-sm font-semibold text-mint"
      >
        {copied ? "コピーしました" : "このページのURLをコピー"}
      </button>
      <p className="text-xs text-muted">
        入室自体はできますが、入室後にブラウザを変えると別人扱いになり席を引き継げません。
      </p>
    </section>
  );
}
