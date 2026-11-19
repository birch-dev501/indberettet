import type { Metadata } from "next";
import Link from "next/link";
import { SearchPanel } from "@/components/search-panel";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SUBSTANCE_COUNT_NOTE } from "@/lib/companies";
import { getCompanyCatalog } from "@/lib/data";
import { formatInt } from "@/lib/format";

export const metadata: Metadata = {
  title: "Firmaer",
  description: "Indehavere af markedsføringstilladelser fra listen over godkendte lægemidler.",
};

export default function CompaniesPage() {
  const companies = getCompanyCatalog().companies.filter((company) => company.productRows > 0);
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZÆØÅ".split("");
  return (
    <>
      <SiteHeader current="firma" />
      <main id="indhold" className="wrap page-head">
        <p className="kicker">Indehavere</p>
        <h1>Firmaer</h1>
        <p className="lede">
          {formatInt(companies.length)} firmaer står som indehaver på Lægemiddelstyrelsens liste over godkendte
          lægemidler. Navne som «Novo Nordisk A/S» og «Eli Lilly Nederland B.V.» er samlet under ét firmanavn.
        </p>
        <p className="warning-note">{SUBSTANCE_COUNT_NOTE}</p>
        <SearchPanel placeholder="Søg på firma, fx Novo eller Eli Lilly" />
        <nav className="alpha" aria-label="Bogstaver">
          {letters.map((letter) => (
            <a key={letter} href={`#firma-${letter}`}>
              {letter}
            </a>
          ))}
        </nav>
        {letters.map((letter) => {
          const group = companies.filter((company) => company.label.toLocaleUpperCase("da").startsWith(letter));
          if (group.length === 0) return null;
          return (
            <section key={letter} id={`firma-${letter}`}>
              <h2>{letter}</h2>
              <div className="substance-index">
                {group.map((company) => (
                  <Link key={company.slug} href={`/firma/${company.slug}`}>
                    {company.label}{" "}
                    <small>
                      {formatInt(company.substances.length)} stoffer · {formatInt(company.productRows)} præparatrækker
                    </small>
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
