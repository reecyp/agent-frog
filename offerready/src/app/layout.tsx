import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Libre_Caslon_Text, Public_Sans } from "next/font/google";
import { Providers } from "@/components/Providers";
import { NAV_INIT_SCRIPT } from "@/components/shell/navState";
import "./globals.css";

// All three families are SIL Open Font License, self-hosted by next/font at build time.
// Caslon: an 18th-century bookface with sturdy hairlines, so headings stay readable on dark.
const caslon = Libre_Caslon_Text({ variable: "--font-caslon", subsets: ["latin"], weight: ["400", "700"], style: ["normal", "italic"], display: "swap" });
const publicSans = Public_Sans({ variable: "--font-public-sans", subsets: ["latin"], display: "swap" });
const plexMono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "500"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "AGENT FROG", template: "%s · AGENT FROG" },
  description: "Tailor your application: find real openings, fit a resume and cover letter to each job from your real experience, and run your whole recruiting season in one place.",
};

export const viewport: Viewport = { themeColor: "#15100d", width: "device-width", initialScale: 1 };

/** Each route group draws its own room and chrome: the entrance, the fitting room (onboarding), the studio (home) and the workspace (tabs). */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-nav is set by NAV_INIT_SCRIPT before hydration, so the attribute may differ from the server's.
    <html lang="en" className={`${caslon.variable} ${publicSans.variable} ${plexMono.variable} antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: NAV_INIT_SCRIPT }} />
      </head>
      <body className="min-h-dvh">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
