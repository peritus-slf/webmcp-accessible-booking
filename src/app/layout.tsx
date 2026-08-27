import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteChrome } from "@/components/site/SiteChrome";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Aurora Hall — tickets and access",
    template: "%s — Aurora Hall",
  },
  description:
    "A WebMCP demonstration: one tool contract served to both an AI agent and a keyboard, screen-reader-native command interface. Neither gets a reduced version.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-slate-50 font-sans text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
