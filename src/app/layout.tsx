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
        <nav className="border-b border-gray-200 bg-white">
          <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
            <Link href="/" className="text-lg font-bold text-gray-900">
              VideoToKB
            </Link>
            <div className="flex items-center gap-4">
              {userEmail && (
                <>
                  <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">
                    Generate
                  </Link>
                  <Link href="/articles" className="text-sm text-gray-600 hover:text-gray-900">
                    Articles
                  </Link>
                  <Link href="/settings" className="text-sm text-gray-600 hover:text-gray-900">
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
