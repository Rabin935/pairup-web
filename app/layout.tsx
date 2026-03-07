import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppShell from "./_components/app-shell";
import { AuthProvider } from "@/context/AuthContext";
import ThemeProvider from "./_components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const PROJECT_LOGO_URL =
  "https://res.cloudinary.com/dtndr0wru/image/upload/v1772865595/pairuplogo_uhkfg9.png";

export const metadata: Metadata = {
  title: "PairUp",
  description: "Find meaningful connections",
  icons: {
    icon: PROJECT_LOGO_URL,
    shortcut: PROJECT_LOGO_URL,
    apple: PROJECT_LOGO_URL,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <AuthProvider>
            <AppShell>{children}</AppShell>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
