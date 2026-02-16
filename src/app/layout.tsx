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
  title: {
    default: "Hunt Planner | Strategic Western Big Game Portfolio",
    template: "%s | Hunt Planner",
  },
  description:
    "Plan your western big game hunting strategy like a financial portfolio. Track preference points, calculate draw investments, and build your personalized 10-year roadmap across CO, WY, MT, and 7 more states.",
  keywords: [
    "western hunting",
    "big game",
    "preference points",
    "draw strategy",
    "elk hunting",
    "mule deer",
    "hunt planner",
  ],
  openGraph: {
    title: "Hunt Planner | Strategic Western Big Game Portfolio",
    description:
      "Plan your western big game hunting strategy like a financial portfolio.",
    type: "website",
    locale: "en_US",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
