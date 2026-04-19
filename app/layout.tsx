import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NBA Predictor",
  description: "A lightweight NBA playoff prediction pool."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
