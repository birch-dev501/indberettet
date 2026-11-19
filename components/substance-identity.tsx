import Link from "next/link";
import type { SubstanceIdentity } from "@/lib/companies";

export function SubstanceIdentityLine({
  identity,
  moreHref,
  linked = true,
}: {
  identity?: SubstanceIdentity | null;
  moreHref: string;
  linked?: boolean;
}) {
  if (!identity || (identity.brandCount === 0 && identity.companies.length === 0)) return null;
  const shown = identity.brands.slice(0, 3);
  const extraBrands = identity.brandCount - shown.length;
  const firms = identity.companies.slice(0, 2);
  const extraFirms = identity.companies.length - firms.length;
  return (
    <p className="identity">
      {shown.length > 0 && (
        <span>
          <span className="identity-label">Handelsnavne</span> {shown.join(", ")}
          {extraBrands > 0 && (
            <>
              {" "}
              {linked ? <Link href={moreHref}>+{extraBrands} flere</Link> : <span>+{extraBrands} flere</span>}
            </>
          )}
        </span>
      )}
      {firms.length > 0 && (
        <span>
          <span className="identity-label">Firma</span>
          {firms.map((company, index) => (
            <span key={company.slug}>
              {index > 0 ? ", " : ""}
              {linked ? <Link href={`/firma/${company.slug}`}>{company.label}</Link> : company.label}
            </span>
          ))}
          {extraFirms > 0 && (
            <>
              {" "}
              {linked ? <Link href={moreHref}>+{extraFirms} flere</Link> : <span>+{extraFirms} flere</span>}
            </>
          )}
        </span>
      )}
    </p>
  );
}
