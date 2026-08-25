/** LINE / SNS アプリ内ブラウザ検知と招待文 */

export type InAppKind = "line" | "instagram" | "facebook" | "twitter" | "other";

export type InAppBrowserInfo = {
  isInApp: boolean;
  kind: InAppKind | null;
  isIOS: boolean;
  isAndroid: boolean;
};

export function detectInAppBrowser(
  ua = typeof navigator !== "undefined" ? navigator.userAgent : "",
): InAppBrowserInfo {
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);

  let kind: InAppKind | null = null;
  if (/Line\//i.test(ua) || / Line\//i.test(ua)) kind = "line";
  else if (/Instagram/i.test(ua)) kind = "instagram";
  else if (/FBAN|FBAV|FB_IAB|FBIOS|FBSS/i.test(ua)) kind = "facebook";
  else if (/Twitter|X\/|TwitterAndroid/i.test(ua)) kind = "twitter";
  else if (
    /MicroMessenger|TikTok|BytedanceWebview|Snapchat|Pinterest|LinkedInApp/i.test(
      ua,
    )
  ) {
    kind = "other";
  }

  return {
    isInApp: kind !== null,
    kind,
    isIOS,
    isAndroid,
  };
}

export function buildInviteText({
  roomUrl,
  homeUrl,
  roomCode,
}: {
  roomUrl: string;
  homeUrl: string;
  roomCode: string;
}): string {
  return [
    "【Value Drop online】",
    "仕事仲間と、価値観を言葉にするカードワークです。",
    "通話（Zoomなど）はそのまま、カード操作は各自のブラウザで行います。",
    "",
    "① 下の部屋リンクを開く",
    "② 表示名を入れて入室",
    "",
    "※ LINEやSNSの中のブラウザだと、あとで画像の保存がうまくいかないことがあります。",
    "　必ず Safari や Chrome など、スマホ本体のブラウザで開いてください。",
    "",
    "部屋リンク:",
    roomUrl,
    "",
    "予備（リンクが開かないとき）:",
    `ホーム ${homeUrl}`,
    `部屋コード ${roomCode}`,
  ].join("\n");
}

export function inAppOpenSteps(info: InAppBrowserInfo): string[] {
  if (!info.isInApp) return [];
  if (info.kind === "line" && info.isIOS) {
    return [
      "右下のメニュー（…）を開く",
      "「Safariで開く」を選ぶ",
      "開いた Safari で、表示名を入れて入室する",
    ];
  }
  if (info.kind === "line" && info.isAndroid) {
    return [
      "右上のメニュー（⋮）を開く",
      "「ブラウザで開く」を選ぶ",
      "開いたブラウザで、表示名を入れて入室する",
    ];
  }
  if (info.isIOS) {
    return [
      "右上などのメニューから「Safariで開く」や「ブラウザで開く」を探す",
      "見つからないときは、下のボタンでURLをコピーし、Safari や Chrome に貼り付ける",
    ];
  }
  if (info.isAndroid) {
    return [
      "メニューから「ブラウザで開く」を探す",
      "見つからないときは、下のボタンでURLをコピーし、Chrome に貼り付ける",
    ];
  }
  return [
    "下のボタンでURLをコピーし、Safari や Chrome など本体のブラウザに貼り付けて開く",
  ];
}
