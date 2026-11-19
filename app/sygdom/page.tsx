import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getDiseases } from "@/lib/data";

export const metadata: Metadata = {
  title: "Find medicin efter sygdom",
  description: "Sygdomsord, der peger på ATC-grupper. Ikke en behandlingsanbefaling.",
};

export default function DiseasesPage() {
  const diseases = getDiseases();
  return (
    <>
      <SiteHeader current="sygdom" />
      <main id="indhold" className="wrap page-head">
        <p className="kicker">ATC</p>
        <h1>Find medicin efter sygdom</h1>
        <p className="lede">
          Ordene herunder peger på ATC-grupper fra listen over godkendte lægemidler. Det er ikke en liste over, hvad
          et stof er godkendt til, og det er ikke en anbefaling.
        </p>
        <p className="review-flag">Teksterne er sat ud fra gruppenavnet og skal gennemses.</p>
        <div className="category-grid">
          {diseases.map((disease) => (
            <Link key={disease.slug} href={`/sygdom/${disease.slug}`} className="card category-card">
              <p className="kicker">{disease.atcPrefixes.join(", ")}</p>
              <h3>{disease.name}</h3>
              <p>{disease.summary}</p>
            </Link>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
