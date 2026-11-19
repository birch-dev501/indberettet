import type { Metadata } from "next";
import { CompanyIndex } from "@/components/company-index";
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
        <CompanyIndex
          companies={companies.map((company) => ({
            slug: company.slug,
            label: company.label,
            aliases: [...new Set([...company.variants, ...(company.searchTerms ?? [])])],
            productRows: company.productRows,
            substanceCount: company.substances.length,
          }))}
        />
      </main>
      <SiteFooter />
    </>
  );
}
