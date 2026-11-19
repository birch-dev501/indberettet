import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Penalties } from "@/components/penalties";
import { ReportIssue } from "@/components/report-issue";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SUBSTANCE_COUNT_NOTE } from "@/lib/companies";
import { getCompany, getCompanyCatalog, getViolation } from "@/lib/data";
import { formatInt } from "@/lib/format";

export const dynamicParams = false;

export function generateStaticParams() {
  return getCompanyCatalog().companies.map((company) => ({ slug: company.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const company = getCompany(slug);
  if (!company) return { title: "Firma ikke fundet" };
  const image = `https://birch-dev501.github.io/indberettet/og/firma/${slug}.png`;
  return {
    title: company.label,
    description: `${company.label} som indehaver på listen over godkendte lægemidler, og de stoffer vi har en bivirkningsoversigt for.`,
    openGraph: { images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", images: [image] },
  };
}

export default async function CompanyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const company = getCompany(slug);
  if (!company) notFound();
  const penalties = getViolation(slug);
  const reports = company.substances.reduce((sum, item) => sum + item.reports, 0);

  return (
    <>
      <SiteHeader current="firma" />
      <main id="indhold" className="wrap page-head">
        <p className="crumbs">
          <Link href="/">Forside</Link> · <Link href="/firma">Firmaer</Link>
        </p>
        <p className="kicker">Indehaver af markedsføringstilladelsen</p>
        <h1>{company.label}</h1>
        <p className="lede">
          {formatInt(company.productRows)} præparatrækker på listen over godkendte lægemidler.{" "}
          {formatInt(company.substances.length)} af stofferne har en hentet bivirkningsoversigt
          {reports > 0 ? `, tilsammen ${formatInt(reports)} indberetninger` : ""}.
        </p>
        {company.note && <p className="note">{company.note}</p>}
        <p className="warning-note">{SUBSTANCE_COUNT_NOTE}</p>
        {company.variants.length > 1 && (
          <p className="muted">
            Også skrevet: {company.variants.filter((variant) => variant !== company.label).join(", ")}.
          </p>
        )}
        {company.substances.length === 0 ? (
          <p>Ingen af præparaterne er knyttet til en hentet bivirkningsoversigt.</p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Stof og handelsnavne</th>
                  <th className="num">Indberetninger</th>
                  <th className="num">Alvorlige</th>
                  <th className="num">Dødsfald</th>
                </tr>
              </thead>
              <tbody>
                {company.substances.map((item) => {
                  const extra = item.brandCount - item.brands.length;
                  return (
                    <tr key={item.slug}>
                      <td>
                        <Link href={`/stof/${item.slug}`}>{item.name}</Link>
                        {item.brands.length > 0 && (
                          <p className="identity">
                            {item.brands.join(", ")}
                            {extra > 0 ? ` +${extra} flere` : ""}
                          </p>
                        )}
                      </td>
                      <td className="num">{formatInt(item.reports)}</td>
                      <td className="num">{formatInt(item.seriousReports)}</td>
                      <td className="num">{formatInt(item.fatalReports)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {penalties && <Penalties record={penalties} />}
        {company.otherProductCount > 0 && (
          <p className="muted">
            {formatInt(company.otherProductCount)} præparatrækker har ikke en hentet oversigt
            {company.otherProductNames.length > 0 ? `, blandt andet ${company.otherProductNames.slice(0, 6).join(", ")}` : ""}.
          </p>
        )}
        <ReportIssue path={`/firma/${slug}/`} />
      </main>
      <SiteFooter />
    </>
  );
}
