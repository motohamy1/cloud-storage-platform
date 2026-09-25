import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

import ThemeProvider from "@/components/providers";

const poppins = Poppins({
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Storage App",
  description:
    "Secure, Modern, Scalable, Reliable way to Store & Manage your data in the cloud",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${poppins.className} antialiased bg-background`}>
        <ThemeProvider>{children}</ThemeProvider>
      {/* impeccable-live-start */}
<script src="http://localhost:8400/live.js"></script>
{/* impeccable-live-end */}
</body>
    </html>
  );
}
