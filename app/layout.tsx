import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fieldwork Supply | Thoughtful things for everyday living",
  description:
    "Useful, beautiful objects from independent makers, chosen for the rituals of everyday life.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
