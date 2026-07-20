import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk, Geist } from "next/font/google";
import "./globals.css";
import SiteHeader from "@/components/shared/SiteHeader";
import SiteFooter from "@/components/shared/SiteFooter";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JMECPS | Research Paper Website",
  description: "Journal of Multidisciplinary Engineering and Computer Processing Systems",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", geist.variable)}>
      <body className={`${inter.variable} ${jetBrainsMono.variable} ${spaceGrotesk.variable} min-h-screen flex flex-col`}>
        <SiteHeader />
        <main className="flex-grow w-full">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
