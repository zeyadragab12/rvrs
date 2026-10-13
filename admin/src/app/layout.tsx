import type { Metadata } from "next";
import { Archivo_Black, DM_Sans } from "next/font/google";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";

const archivo = Archivo_Black({ weight: "400", subsets: ["latin"], variable: "--font-archivo" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });

export const metadata: Metadata = {
  title: "RVRS Admin",
  description: "Order and menu management for RVRS Egypt staff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} ${dmSans.variable} h-full antialiased`}>
      <body className="min-h-full">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
