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
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://odysseyoutdoors.com"
  ),
  title: {
    default: "Odyssey Outdoors | Strategic Western Big Game Portfolio",
    template: "%s | Odyssey Outdoors",
  },
  description:
    "Plan your western big game hunting strategy like a financial portfolio. Track preference points, calculate draw investments, and build your personalized multi-year roadmap across the top western states.",
  keywords: [
    "western hunting",
    "big game",
    "preference points",
    "draw strategy",
    "elk hunting",
    "mule deer",
    "odyssey outdoors",
  ],
  openGraph: {
    title: "Odyssey Outdoors | Strategic Western Big Game Portfolio",
    description:
      "Plan your western big game hunting strategy like a financial portfolio.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Odyssey Outdoors | Strategic Western Big Game Portfolio",
    description:
      "Plan your western big game hunting strategy like a financial portfolio.",
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
