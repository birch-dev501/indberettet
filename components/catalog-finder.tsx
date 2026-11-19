"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SubstanceIdentityLine } from "@/components/substance-identity";
import { formatInt } from "@/lib/format";

type Row = { slug: string; name: string; reports: number };
type Identity = { brands: string[]; brandCount: number; companies: { slug: string; label: string }[] };

export function CatalogFinder({
  substances,
  identities,
}: {
  substances: Row[];
  identities: Record<string, Identity | undefined>;
}) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLocaleLowerCase("da-DK");
  const shown = useMemo(
    () => (needle.length < 2 ? substances : substances.filter((item) => item.name.toLocaleLowerCase("da-DK").includes(needle))),
    [needle, substances],
  );
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  return (
    <div data-search="katalog">
      <label className="kicker" htmlFor="katalog-filter">
        Filtrér listen
      </label>
      <input
        id="katalog-filter"
        role="searchbox"
        value={query}
        placeholder="Filtrér stoffer på denne side"
        autoComplete="off"
        onChange={(event) => setQuery(event.target.value)}
      />
      {needle.length >= 2 && (
        <p className="small">
          <Link href={`/soeg/?q=${encodeURIComponent(query.trim())}`}>Søg i alt efter «{query.trim()}»</Link>
        </p>
      )}
      <nav className="alpha" aria-label="Bogstaver">
        {letters.map((letter) => (
          <a key={letter} href={`#bogstav-${letter}`}>
            {letter}
          </a>
        ))}
      </nav>
      {letters.map((letter) => {
        const group = shown.filter((item) => item.name.toLocaleUpperCase("da").startsWith(letter));
        if (group.length === 0) return null;
        return (
          <section key={letter} id={`bogstav-${letter}`}>
            <h2>{letter}</h2>
            <div className="substance-index">
              {group.map((item) => (
                <Link key={item.slug} href={`/stof/${item.slug}`}>
                  {item.name} <small>{formatInt(item.reports)}</small>
                  <SubstanceIdentityLine identity={identities[item.slug]} moreHref={`/stof/${item.slug}#praeparater`} linked={false} />
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
