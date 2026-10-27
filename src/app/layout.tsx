import type { Metadata } from "next";
import { Inter, Manrope, Noto_Sans_Devanagari, Sora } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import "@/styles/globals.css";

const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-devanagari",
  display: "swap",
});
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const sora = Sora({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-sora", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-manrope", display: "swap" });

export const metadata: Metadata = {
  title: { default: "DigitalGP", template: "%s · DigitalGP" },
  description: "Gram Panchayat websites and administration — Government of Maharashtra",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${notoDevanagari.variable} ${inter.variable} ${sora.variable} ${manrope.variable}`}>
      <body className="font-sans text-ink bg-canvas">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
