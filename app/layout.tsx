import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SysTradeHub | 차트 패턴·캔들·뉴스",
  description: "시그널 P, C, K의 패턴 분석과 주식 뉴스, 공시, 시장 데이터를 한곳에서 확인하세요.",
  icons: { icon: "/favicon.svg" },
  applicationName: "SysTradeHub",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "SysTradeHub" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"/><link rel="manifest" href="/manifest.webmanifest"/></head><body>{children}</body></html>;
}
