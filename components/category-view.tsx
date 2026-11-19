"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CategoryCompareChart } from "@/components/charts";
import { SubstanceIdentityLine } from "@/components/substance-identity";
import { SUBSTANCE_COUNT_NOTE, type SubstanceIdentity } from "@/lib/companies";
import { CAUSALITY_NOTE } from "@/lib/rates";
import { formatInt } from "@/lib/format";
import type { CategoryGroup } from "@/lib/categories";

const CHART_LIMIT = 12;

export function CategoryView({
  category,
  identities = {},
}: {
  category: CategoryGroup;
  identities?: Record<string, SubstanceIdentity>;
}) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLocaleLowerCase("da");
  const visible = useMemo(
    () =>
      category.members.filter((member) => {
        if (!needle) return true;
        const identity = identities[member.slug];
        const haystack = [
          member.name,
          ...(identity?.brands ?? []),
          ...(identity?.companies.map((company) => company.label) ?? []),
        ]
          .join(" ")
          .toLocaleLowerCase("da");
        return haystack.includes(needle);
      }),
    [category.members, identities, needle],
  );
  const chartRows = category.members.slice(0, CHART_LIMIT).map((member) => ({
    name: member.name.length > 24 ? `${member.name.slice(0, 22).trimEnd()}…` : member.name,
    nonserious: Math.max(0, member.reports - member.seriousReports - member.fatalReports),
    serious: member.seriousReports,
    fatal: member.fatalReports,
  }));

  return (
    <>
      <header className="page-head">
        <p className="crumbs">
          <Link href="/">Forside</Link> · <Link href="/kategori">Grupper</Link>
        </p>
        <p className="kicker">ATC {category.atc}</p>
        <h1>{category.name}</h1>
        <p className="lede">{category.description}</p>
        <p className="muted">
          Officielt gruppenavn: {category.officialName}. Et stof er med, når mindst ét godkendt præparat har en
          ATC-kode, der begynder med {category.atc}.
        </p>
      </header>

      <div className="stat-grid">
        <article className="stat">
          <strong>{formatInt(category.members.length)}</strong>
          <span>Stoffer med oversigt</span>
        </article>
        <article className="stat">
          <strong>{formatInt(category.reports)}</strong>
          <span>Indberetninger i oversigterne</span>
        </article>
        <article className="stat serious">
          <strong>{formatInt(category.seriousReports)}</strong>
          <span>Alvorlige, ikke dødsfald</span>
        </article>
        <article className="stat fatal">
          <strong>{formatInt(category.fatalReports)}</strong>
          <span>Dødsfald</span>
        </article>
      </div>
        <p className="warning-note">
        {CAUSALITY_NOTE} Tallene er ikke en hyppighed. Summen lægger oversigterne sammen. Samme indberetning kan
        stå under flere stoffer, så gruppen er ikke et antal personer. {SUBSTANCE_COUNT_NOTE}
      </p>

      <section className="card">
        <h2>Sammenligning</h2>
        <p className="muted">
          {category.members.length > CHART_LIMIT
            ? `Diagrammet viser de ${CHART_LIMIT} oversigter med flest indberetninger. Hele gruppen står i tabellen.`
            : "Hver bjælke er ét stof. Længden er antal indberetninger, ikke en risiko."}
        </p>
        <p className="legend">
          <span>
            <i className="swatch ns" /> Ikke-alvorlig
          </span>
          <span>
            <i className="swatch serious" /> Alvorlig
          </span>
          <span>
            <i className="swatch fatal" /> Dødsfald
          </span>
        </p>
        <CategoryCompareChart rows={chartRows} />
      </section>

      <section className="section">
        <div className="term-tools">
          <h2>Stoffer i gruppen</h2>
          {category.members.length > 8 && (
              <input
              value={query}
              placeholder="Filtrér på stof, handelsnavn eller firma"
              aria-label="Filtrér stoffer i gruppen"
              onChange={(event) => setQuery(event.target.value)}
            />
          )}
        </div>
        {visible.length === 0 ? (
          <p className="muted">Ingen stoffer matcher “{query.trim()}”.</p>
        ) : (
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
                {visible.map((member) => (
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
        )}
      </section>
    </>
  );
}
