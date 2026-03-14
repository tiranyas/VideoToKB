import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { UserMenu } from "@/components/user-menu";
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
  title: "VideoToKB",
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
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
            <Link href="/" className="text-xl font-semibold tracking-tight text-gray-900">
              VideoToKB
            </Link>
            <div className="flex items-center gap-6">
              {userEmail && (
                <>
                  <Link href="/" className="text-sm text-gray-400 hover:text-gray-900 transition-colors">
                    Generate
                  </Link>
                  <Link href="/articles" className="text-sm text-gray-400 hover:text-gray-900 transition-colors">
                    Articles
                  </Link>
                  <Link href="/settings" className="text-sm text-gray-400 hover:text-gray-900 transition-colors">
                    Settings
                  </Link>
                  <UserMenu email={userEmail} />
                </>
              )}
            </div>
          </div>
        </nav>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
