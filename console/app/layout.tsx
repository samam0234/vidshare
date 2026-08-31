import type { Metadata } from "next";
import { AdminAuthProvider } from "@/context/AdminAuthContext";
import AdminNav from "@/components/layout/AdminNav";
import AdminRouteGuard from "@/components/layout/AdminRouteGuard";
import "./globals.css";

export const metadata: Metadata = {
  title: "VidShare Console — 관리자",
  description: "VidShare 운영 콘솔",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <AdminAuthProvider>
          <AdminNav />
          <AdminRouteGuard>
            <div className="flex flex-1 flex-col">{children}</div>
          </AdminRouteGuard>
        </AdminAuthProvider>
      </body>
    </html>
  );
}
