import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "/indberettet";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Indberettet",
    short_name: "Indberettet",
    description: "Formodede bivirkninger i Danmark, fra Lægemiddelstyrelsens åbne tal.",
    start_url: `${base}/`,
    scope: `${base}/`,
    display: "standalone",
    lang: "da",
    dir: "ltr",
    background_color: "#f4f0e6",
    theme_color: "#114e49",
    icons: [
      { src: `${base}/icons/icon-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `${base}/icons/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: `${base}/icons/icon-maskable-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
