import type { Metadata } from "next";
import Link from "next/link";
import { SearchPanel } from "@/components/search-panel";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SubstanceIdentityLine } from "@/components/substance-identity";
import { getCompanyCatalog, getIndex } from "@/lib/data";
import { formatInt } from "@/lib/format";

export const metadata: Metadata = {
  title: "Stoffer og præparater",
  description: "Søg i godkendte lægemidler og de stoffer, der har en åben bivirkningsoversigt.",
};

export default function CatalogPage() {
  const substances = [...getIndex().substances].sort((a, b) => a.name.localeCompare(b.name, "da"));
  const identities = getCompanyCatalog().bySlug;
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  return (
    <>
      <SiteHeader current="katalog" />
      <main id="indhold" className="wrap page-head">
        <p className="kicker">Register</p>
        <h1>Stoffer og præparater</h1>
        <p className="lede">
          {formatInt(substances.length)} stoffer har en hentet oversigt. Søg også på handelsnavn fra listen over
          godkendte lægemidler. Et præparat uden oversigt har ingen behandlede indberetninger i det åbne register,
          eller stoffet kunne ikke matches sikkert.
        </p>
        <SearchPanel autoFocus />
        <nav className="alpha" aria-label="Bogstaver">
          {letters.map((letter) => (
            <a key={letter} href={`#bogstav-${letter}`}>
              {letter}
            </a>
          ))}
        </nav>
        {letters.map((letter) => {
          const group = substances.filter((item) => item.name.toLocaleUpperCase("da").startsWith(letter));
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
      </main>
      <SiteFooter />
    </>
  );
}
