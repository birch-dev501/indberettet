"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SearchPanel } from "@/components/search-panel";

export function MissingPage() {
  const [segment, setSegment] = useState<string | null>(null);
  useEffect(() => {
    const parts = window.location.pathname.split("/").filter(Boolean);
    const last = parts.at(-1) === "indberettet" ? "" : (parts.at(-1) ?? "");
    setSegment(decodeURIComponent(last));
  }, []);
  const query = (segment ?? "").replace(/-/g, " ");
  return (
    <>
      <SiteHeader />
      <main id="indhold" className="wrap page-head">
        <p className="kicker">404</p>
        <h1>Siden findes ikke</h1>
        <p>
          {query
            ? `Der er ingen side for «${query}». Prøv søgningen, som bruger det ord fra adressen.`
            : "Adressen peger ikke på en side, vi har."}
        </p>
        {segment !== null && <SearchPanel initial={query} />}
        {query ? (
          <p>
            <Link href={`/soeg/?q=${encodeURIComponent(query)}`}>Se alle forslag for «{query}»</Link>
          </p>
        ) : (
          <p>
            <Link href="/katalog">Gå til stofferne</Link>
          </p>
        )}
      </main>
    </>
  );
}
