import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
  return {
    title: substance.name,
    description: `${reports.toLocaleString("da-DK")} indberetninger om formodede bivirkninger ved ${substance.name} i Danmark. Tal fra Lægemiddelstyrelsen.`,
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
      </main>
      <SiteFooter />
    </>
  );
}
