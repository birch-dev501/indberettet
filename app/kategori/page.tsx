import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getCategories } from "@/lib/data";
import { formatInt } from "@/lib/format";

export const metadata: Metadata = {
  title: "Grupper",
  description: "Stoffer samlet efter ATC-kode fra listen over godkendte lægemidler.",
};

export default function CategoriesPage() {
  const categories = getCategories();
  return (
    <>
      <SiteHeader current="kategori" />
      <main id="indhold" className="wrap page-head">
        <p className="kicker">ATC</p>
        <h1>Grupper</h1>
        <p className="lede">
          Grupperne følger officielle ATC-koder på Lægemiddelstyrelsens liste over godkendte lægemidler. Et stof er
          med, når mindst ét af dets godkendte præparater har koden, og vi har hentet en bivirkningsoversigt.
        </p>
        <div className="category-grid">
          {categories.map((category) => (
            <Link key={category.slug} href={`/kategori/${category.slug}`} className="card category-card">
              <p className="kicker">ATC {category.atc}</p>
              <h3>{category.name}</h3>
              <p>{category.description}</p>
              <p className="small muted">
                {formatInt(category.members.length)} stoffer · {formatInt(category.reports)} indberetninger
              </p>
            </Link>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
