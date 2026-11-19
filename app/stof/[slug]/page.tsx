import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReportIssue } from "@/components/report-issue";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SubstanceView } from "@/components/substance-view";
import { categoriesForSubstance } from "@/lib/categories";
import { getCategories, getIdentity, getIndex, getNews, getPlain, getProducts, getSubstance, getUsage } from "@/lib/data";
import { substanceRate } from "@/lib/rates";

export const dynamicParams = false;

export function generateStaticParams() {
  return getIndex().substances.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const substance = getSubstance(slug);
  if (!substance) return { title: "Stof ikke fundet" };
  const reports = substance.views.all.reports;
  const image = `https://birch-dev501.github.io/indberettet/og/stof/${slug}.png`;
  return {
    title: substance.name,
    description: `${reports.toLocaleString("da-DK")} indberetninger om formodede bivirkninger ved ${substance.name} i Danmark. Tal fra Lægemiddelstyrelsen.`,
    openGraph: { images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", images: [image] },
  };
}

export default async function SubstancePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const substance = getSubstance(slug);
  if (!substance) notFound();
  const atcs = getProducts()
    .filter((product) => product.slugs.includes(slug))
    .map((product) => product.atc);
  const rate = substanceRate({
    atcs,
    reportYears: substance.views.all.years.map((row) => ({ year: row.year, reports: row.reports })),
    usage: getUsage(),
  });

  return (
    <>
      <SiteHeader />
      <main id="indhold" className="wrap">
        <SubstanceView
          substance={substance}
          news={getNews(slug)}
          categories={categoriesForSubstance(getCategories(), slug).map((group) => ({
            slug: group.slug,
            name: group.name,
          }))}
          rate={rate}
          plain={getPlain(slug)}
          identity={getIdentity(slug)}
        />
        <ReportIssue path={`/stof/${slug}/`} />
      </main>
      <SiteFooter />
    </>
  );
}
