import type { Metadata, Viewport } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import { InstallApp } from "@/components/install-app";
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

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "/indberettet";
const siteUrl = "https://birch-dev501.github.io/indberettet";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Indberettet — formodede bivirkninger i Danmark",
    template: "%s · Indberettet",
  },
  description:
    "Åbne tal fra Lægemiddelstyrelsens interaktive bivirkningsoversigter. Formodede bivirkninger, ikke bevis for årsag og ikke en hyppighed.",
  applicationName: "Indberettet",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Indberettet — formodede bivirkninger i Danmark",
    description:
      "Åbne tal fra Lægemiddelstyrelsens interaktive bivirkningsoversigter. Formodede bivirkninger, ikke bevis for årsag og ikke en hyppighed.",
    url: siteUrl,
    locale: "da_DK",
    type: "website",
  },
  appleWebApp: {
    capable: true,
    title: "Indberettet",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#114e49",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="da" className={`${sans.variable} ${serif.variable}`}>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href={`${base}/icons/apple-touch-icon.png`} sizes="180x180" />
      </head>
      <body>
        {children}
        <InstallApp />
      </body>
    </html>
  );
}
