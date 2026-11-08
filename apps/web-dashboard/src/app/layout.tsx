import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/Navbar";
import { MobileNav } from "@/components/MobileNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "SkillX — Sukkur IBA University Peer Exchange",
  description: "Hyper-local peer-to-peer intra-university skill exchange engine at Sukkur IBA University.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
  }
};

export const viewport: Viewport = {
  themeColor: "#1A365D",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased">
        <Providers>
          <Navbar />
          <main className="flex-1 pb-16 md:pb-8">{children}</main>
          <MobileNav />
        </Providers>
      </body>
    </html>
  );
}
