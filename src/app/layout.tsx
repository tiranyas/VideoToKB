import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";
import { CookieConsent } from "@/components/cookie-consent";
import { HelpPanel } from "@/components/help-panel";
import { FeedbackButton } from "@/components/feedback-button";
import { WorkspaceProvider } from "@/contexts/workspace-context";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = "https://kbpipe.io";

export const metadata: Metadata = {
  title: {
    default: "KBPipe — AI-Powered Knowledge Base Generator",
    template: "%s | KBPipe",
  },
  description:
    "Turn any video, transcript, or text into publish-ready knowledge base articles. Supports Loom, YouTube, Google Drive. Export to HelpJuice, Zendesk, Intercom & more.",
  metadataBase: new URL(siteUrl),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "KBPipe",
    title: "KBPipe — Turn any content into KB articles with AI",
    description:
      "Paste a video URL or text, pick a template, get a structured knowledge base article in minutes. Free to start.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "KBPipe — AI-Powered Knowledge Base Generator",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "KBPipe — Turn any content into KB articles with AI",
    description:
      "Paste a video URL or text, pick a template, get a structured knowledge base article in minutes.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon-32.png",
    apple: "/apple-touch-icon.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let userEmail: string | null = null;

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    userEmail = user?.email ?? null;
  } catch {
    // Not authenticated or cookies not available
  }

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {userEmail ? (
          <WorkspaceProvider>
            <div className="flex min-h-screen bg-grid">
              <Sidebar email={userEmail} />
              <main className="flex-1 min-w-0">
                {children}
              </main>
              <HelpPanel />
              <FeedbackButton />
            </div>
          </WorkspaceProvider>
        ) : (
          <div className="bg-grid min-h-screen">
            {children}
          </div>
        )}
        <Toaster />
        <CookieConsent />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
