import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryView } from "@/components/category-view";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getCategories, getCategory, getCompanyCatalog } from "@/lib/data";

export const dynamicParams = false;

export function generateStaticParams() {
  return getCategories().map((group) => ({ slug: group.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) return { title: "Gruppe ikke fundet" };
  return {
    title: category.name,
    description: `${category.officialName} (ATC ${category.atc}). Formodede bivirkninger for stofferne i gruppen, fra Lægemiddelstyrelsen.`,
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) notFound();
  const identities = Object.fromEntries(
    category.members.map((member) => [member.slug, getCompanyCatalog().bySlug[member.slug]]).filter((entry) => entry[1]),
  );

  return (
    <>
      <SiteHeader current="kategori" />
      <main id="indhold" className="wrap">
        <CategoryView category={category} identities={identities} />
      </main>
      <SiteFooter />
    </>
  );
}
