import type { Metadata } from "next";
import { CatalogFinder } from "@/components/catalog-finder";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getCompanyCatalog, getIndex } from "@/lib/data";
import { formatInt } from "@/lib/format";

export const metadata: Metadata = {
  title: "Stoffer og præparater",
  description: "Søg i godkendte lægemidler og de stoffer, der har en åben bivirkningsoversigt.",
};

export default function CatalogPage() {
  const substances = [...getIndex().substances].sort((a, b) => a.name.localeCompare(b.name, "da"));
  const identities = getCompanyCatalog().bySlug;
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
        <CatalogFinder
          substances={substances.map((item) => ({ slug: item.slug, name: item.name, reports: item.reports }))}
          identities={identities}
        />
      </main>
      <SiteFooter />
    </>
  );
}
