import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Ingen forbindelse",
};

export default function OfflinePage() {
  return (
    <main
      id="indhold"
      style={{
        minHeight: "100vh",
        margin: 0,
        padding: "2.5rem 1.25rem",
        background: "#f4f0e6",
        color: "#1c1915",
        fontFamily: "Georgia, serif",
      }}
    >
      <p style={{ letterSpacing: "0.14em", textTransform: "uppercase", fontSize: "0.8rem", color: "#114e49" }}>
        Indberettet
      </p>
      <h1 style={{ fontSize: "2.4rem", lineHeight: 1.1, margin: "0.4rem 0 1rem" }}>Ingen forbindelse.</h1>
      <p style={{ fontFamily: "sans-serif", fontSize: "1.05rem", lineHeight: 1.5, maxWidth: "36rem" }}>
        Siden kan ikke hentes lige nu. Sider, du allerede har åbnet, kan stadig ligge på telefonen. Prøv igen, når du er
        online.
      </p>
      <p style={{ marginTop: "1.5rem" }}>
        <Link href="/" style={{ color: "#114e49" }}>
          Til forsiden
        </Link>
      </p>
    </main>
  );
}
