import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SubstanceIdentityLine } from "@/components/substance-identity";
import { SUBSTANCE_COUNT_NOTE } from "@/lib/companies";
import { CAUSALITY_NOTE } from "@/lib/rates";
import { getCompanyCatalog, getDiseases, getIndex, getProducts } from "@/lib/data";
import { formatInt } from "@/lib/format";

export const dynamicParams = false;

export function generateStaticParams() {
  return getDiseases().map((disease) => ({ slug: disease.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const disease = getDiseases().find((item) => item.slug === slug);
  if (!disease) return { title: "Sygdom ikke fundet" };
  return { title: disease.name, description: disease.summary };
}

export default async function DiseasePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const disease = getDiseases().find((item) => item.slug === slug);
  if (!disease) notFound();
  const products = getProducts();
  const identities = getCompanyCatalog().bySlug;
  const allowed = new Set<string>();
  for (const product of products) {
    const code = product.atc.toUpperCase();
    if (!disease.atcPrefixes.some((prefix) => code.startsWith(prefix))) continue;
    for (const substanceSlug of product.slugs) allowed.add(substanceSlug);
  }
  const members = getIndex()
    .substances.filter((item) => allowed.has(item.slug))
    .sort((a, b) => b.reports - a.reports || a.name.localeCompare(b.name, "da"));

  return (
    <>
      <SiteHeader current="sygdom" />
      <main id="indhold" className="wrap page-head">
        <p className="crumbs">
          <Link href="/">Forside</Link> · <Link href="/sygdom">Sygdomme</Link>
        </p>
        <p className="kicker">ATC {disease.atcPrefixes.join(", ")}</p>
        <h1>{disease.name}</h1>
        <p className="lede">{disease.summary}</p>
        <p className="warning-note">
          {CAUSALITY_NOTE} Listen følger ATC-gruppenavnet ({disease.source}). Den siger ikke, at hvert stof er godkendt
          til {disease.name.toLocaleLowerCase("da")}. {SUBSTANCE_COUNT_NOTE}
        </p>
        {disease.needsReview && <p className="review-flag">Skal gennemses.</p>}
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Stof, handelsnavn og firma</th>
                <th className="num">Indberetninger</th>
                <th className="num">Alvorlige</th>
                <th className="num">Dødsfald</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.slug}>
                  <td>
                    <Link href={`/stof/${member.slug}`}>{member.name}</Link>
                    <SubstanceIdentityLine identity={identities[member.slug]} moreHref={`/stof/${member.slug}#praeparater`} />
                  </td>
                  <td className="num">{formatInt(member.reports)}</td>
                  <td className="num">{formatInt(member.seriousReports)}</td>
                  <td className="num">{formatInt(member.fatalReports)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
