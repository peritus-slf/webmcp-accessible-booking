import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aurora Hall — accessible seating",
  description:
    "A WebMCP demo: one tool contract served to both an AI agent and a keyboard, screen-reader-native command interface. Neither gets a reduced version.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-slate-50 font-sans text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        {/*
          The skip link is the first focusable element on the page. The seating
          plan holds 330 focusable cells; without this, reaching the booking
          summary by keyboard means traversing every one of them.
        */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-slate-900 focus:px-4 focus:py-2 focus:text-white dark:focus:bg-white dark:focus:text-slate-900"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
