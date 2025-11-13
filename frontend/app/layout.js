import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "./components/Sidebar";
import { TenantProvider } from "@/lib/TenantContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Echo5 Leads Management",
  description: "Manage your leads efficiently",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <TenantProvider>
          <div className="flex">
            <Sidebar />
            <main className="ml-64 flex-1">
              {children}
            </main>
          </div>
        </TenantProvider>
      </body>
    </html>
  );
}
