import type { Metadata, Viewport } from "next";
import "./globals.css";
import { MobileShell } from "@/components/MobileShell";

export const metadata: Metadata = {
  title: "就吃这个",
  description: "别刷了，让我替你们选。两个人一起决定今天吃什么。",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "就吃这个",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#F7F5F1",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <MobileShell>{children}</MobileShell>
      </body>
    </html>
  );
}
