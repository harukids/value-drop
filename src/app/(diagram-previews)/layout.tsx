import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "見本 | Value Drop",
  robots: { index: false, follow: false },
};

export default function DiagramPreviewsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
