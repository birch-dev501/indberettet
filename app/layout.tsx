import type { Metadata } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const sans = Source_Sans_3({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  display: "swap",
});

const serif = Fraunces({
  subsets: ["latin", "latin-ext"],
  variable: "--font-serif",
  display: "swap",
});

const siteUrl = "https://birch-dev501.github.io/indberettet";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Indberettet — formodede bivirkninger i Danmark",
    template: "%s · Indberettet",
  },
  description:
    "Åbne tal fra Lægemiddelstyrelsens interaktive bivirkningsoversigter. Formodede bivirkninger, ikke bevis for årsag og ikke en hyppighed.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Indberettet — formodede bivirkninger i Danmark",
    description:
      "Åbne tal fra Lægemiddelstyrelsens interaktive bivirkningsoversigter. Formodede bivirkninger, ikke bevis for årsag og ikke en hyppighed.",
    url: siteUrl,
    locale: "da_DK",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="da" className={`${sans.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
