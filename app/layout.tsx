import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import { Bebas_Neue, Outfit } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/providers/query-provider";
import { AuthProvider, type AuthUser } from "@/providers/auth-provider";
import { getLoggedInUser } from "@/lib/appwrite/server";
import { getProfileByUserId } from "@/actions/profiles";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const bebasNeue = Bebas_Neue({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const viewport: Viewport = {
  themeColor: "#0e0e10",
};

export const metadata: Metadata = {
  title: {
    default: "RiffOff — Music Events, Tickets & More",
    template: "%s | RiffOff",
  },
  description:
    "Discover music events, buy tickets, and connect with artists. The platform for small-to-mid scale music events.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RiffOff Scanner",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let authUser: AuthUser | null = null;
  const user = await getLoggedInUser();

  if (user) {
    const profile = await getProfileByUserId(user.$id);
    authUser = {
      id: user.$id,
      email: user.email,
      name: user.name || profile?.displayName || "User",
      role: profile?.role ?? "attendee",
    };
  }

  return (
    <html
      lang="en"
      className={`${outfit.variable} ${geistMono.variable} ${bebasNeue.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <head>
        {/* Prevent flash of wrong theme — runs before paint */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){try{var t=localStorage.getItem('riffoff-theme');if(t==='light'){document.documentElement.classList.remove('dark')}else{document.documentElement.classList.add('dark')}}catch(e){}})()
        `}} />
      </head>
      <body className="grain min-h-full flex flex-col bg-background text-foreground">
        <QueryProvider>
          <AuthProvider user={authUser}>
            {children}
            <Toaster
              position="bottom-right"
              richColors
              toastOptions={{
                style: {
                  background: "oklch(0.15 0.01 270 / 80%)",
                  backdropFilter: "blur(16px)",
                  border: "1px solid oklch(1 0 0 / 8%)",
                  color: "oklch(0.95 0.01 80)",
                },
              }}
            />
          </AuthProvider>
        </QueryProvider>
        {/* Service Worker registration — static string, no user input (XSS-safe) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
