import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";
import { CookieConsent } from "@/components/cookie-consent";
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

export const metadata: Metadata = {
  title: "KBify",
  description: "Convert video recordings into structured knowledge base articles",
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
            </div>
          </WorkspaceProvider>
        ) : (
          <div className="bg-grid min-h-screen">
            {children}
          </div>
        )}
        <Toaster />
        <CookieConsent />
      </body>
    </html>
  );
}
