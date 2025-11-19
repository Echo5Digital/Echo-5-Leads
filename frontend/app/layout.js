'use client';

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "./components/Sidebar";
import { TenantProvider } from "@/lib/TenantContext";
import { AuthProvider } from "@/lib/AuthContext";
import { usePathname } from "next/navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

function LayoutContent({ children }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname === '/unauthorized';

  return (
    <div className="flex">
      <Sidebar />
      <main className={`flex-1 ${!isAuthPage ? 'ml-64' : ''}`}>
        {children}
      </main>
    </div>
  );
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <TenantProvider>
            <LayoutContent>{children}</LayoutContent>
          </TenantProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
