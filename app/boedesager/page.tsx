import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { caseAnchor, caseNotes } from "@/lib/case-notes";

export const metadata: Metadata = {
  title: "Store bødesager",
  description: "Udvalgte, kildebelagte sager om lægemiddelfirmaer. Ikke en komplet liste over bøder.",
};

export default function ScandalsPage() {
  const notes = caseNotes().filter((item) => item.url || item.detail);
  return (
    <>
      <SiteHeader current="sager" />
      <main id="indhold" className="wrap page-head">
        <p className="kicker">Udvalgte sager</p>
        <h1>Store bødesager</h1>
        <p className="lede">
          Sagerne er valgt, fordi lægemidlet er kendt, og beløbet kan læses i en offentlig kilde. Listen er ikke alle
          bøder i Violation Tracker. Et link til et dansk firma betyder, at stoffet sælges der, ikke at firmaet selv
          blev dømt i sagen.
        </p>
        <ul className="scandal-list">
          {notes.map((item) => {
            const id = item.url ? caseAnchor(item.url) : undefined;
            const drug = item.drugs[0];
            return (
              <li key={item.sourceUrl} id={id} className="card">
                <h2>{item.headline ?? `${drug?.name ?? "Sag"}${item.year ? ` ${item.year}` : ""}`}</h2>
                <p>{item.summary}</p>
                {item.detail ? <p>{item.detail}</p> : null}
                <p className="small">
                  {item.drugs.map((named) =>
                    named.slug ? (
                      <Link key={named.slug} href={`/stof/${named.slug}`}>
                        {named.name} ({named.generic})
                      </Link>
                    ) : (
                      <span key={named.name}>
                        {named.name} ({named.generic})
                      </span>
                    ),
                  )}
                  {item.firm ? (
                    <>
                      {" "}
                      · <Link href={`/firma/${item.firm}`}>Firmaside</Link>
                    </>
                  ) : null}
                </p>
                <p className="small">
                  <a href={item.sourceUrl}>{item.sourceName}</a>
                  {item.url ? (
                    <>
                      {" "}
                      · <a href={item.url}>Violation Tracker</a>
                    </>
                  ) : null}
                </p>
              </li>
            );
          })}
        </ul>
      </main>
      <SiteFooter />
    </>
  );
}
