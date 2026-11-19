"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { AgeChart, AgeSeriousnessChart, type AgeSeriousnessRow, YearChart } from "@/components/charts";
import { RateCard } from "@/components/rate-card";
import { formatDate, formatInt, formatPercent } from "@/lib/format";
import type { PlainLanguage } from "@/lib/data";
import { SubstanceIdentityLine } from "@/components/substance-identity";
import { SUBSTANCE_COUNT_NOTE, type SubstanceIdentity } from "@/lib/companies";
import { CAUSALITY_NOTE, type SubstanceRate } from "@/lib/rates";
import { englishSourceNote, resolveSoc, resolveTerm } from "@/lib/term-links";
import type { NewsItem, Substance, SubstanceView } from "@/lib/types";

const VIEWS = [
  { id: "all", label: "Alle" },
  { id: "N", label: "Ikke-alvorlige" },
  { id: "S", label: "Alvorlige" },
  { id: "F", label: "Dødsfald" },
] as const;

export function SubstanceView({
  substance,
  news,
  categories = [],
  rate = null,
  plain = null,
  identity = null,
}: {
  substance: Substance;
  news: NewsItem[];
  categories?: { slug: string; name: string }[];
  rate?: SubstanceRate | null;
  plain?: PlainLanguage | null;
  identity?: SubstanceIdentity | null;
}) {
  const [viewId, setViewId] = useState<(typeof VIEWS)[number]["id"]>("all");
  const [termQuery, setTermQuery] = useState("");
  const [metric, setMetric] = useState<"reactions" | "reports">("reactions");
  const [preparation, setPreparation] = useState("");
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("praeparat");
    if (value) setPreparation(value.slice(0, 160));
  }, []);
  const view = substance.views[viewId];
  const all = substance.views.all;
  const yearPeak = [...all.years].sort((a, b) => b.reports - a.reports)[0];

  return (
    <>
      <header className="page-head">
        <p className="crumbs">
          <Link href="/">Forside</Link> · <Link href="/katalog">Stoffer</Link>
        </p>
        <div className="substance-title">
          <div>
            <p className="kicker">Aktivt stof · {substance.country === "DK" ? "indberettet i Danmark" : substance.country}</p>
            <h1>{substance.name}</h1>
            <SubstanceIdentityLine identity={identity} moreHref="#praeparater" />
            {plain && <PlainIntro plain={plain} />}
            <p className="lede">
              {formatInt(all.reports)} indberetninger om formodede bivirkninger og {formatInt(all.reactions)}{" "}
              registrerede reaktioner. Navnet er Lægemiddelstyrelsens: {substance.sourceName}.
            </p>
            {categories.length > 0 && (
              <p className="category-links">
                Gruppe:{" "}
                {categories.map((category) => (
                  <Link key={category.slug} href={`/kategori/${category.slug}`}>
                    {category.name}
                  </Link>
                ))}
              </p>
            )}
          </div>
          <div className="actions">
            <span className="date-pill">
              Data opdateret <strong>{formatDate(substance.dataExtractionDate)}</strong>
            </span>
            <a className="button primary" href={substance.sourcePage}>
              Se hos Lægemiddelstyrelsen
            </a>
            <a className="button" href={substance.zipUrl}>
              Hent original ZIP
            </a>
            <button className="button" type="button" onClick={() => downloadSubstance(substance)}>
              Hent renset JSON
            </button>
          </div>
        </div>
        {preparation && (
          <p className="note">
            Du søgte præparatet <strong>{preparation}</strong>. Tallene herunder gælder hele det aktive stof{" "}
            {substance.name}, ikke kun dette handelsnavn. En indberetning kan desuden nævne flere lægemidler.
          </p>
        )}
        {substance.stale && (
          <p className="warning-note">
            Seneste forsøg på at hente nye tal fejlede ({substance.staleReason}). Siden viser det sidste gyldige udtræk.
          </p>
        )}
      </header>

      <SummaryCard substance={substance} />
      {rate && <RateCard rate={rate} />}

      <div className="stat-grid">
        <article className="stat">
          <strong>{formatInt(view.reports)}</strong>
          <span>Indberetninger</span>
        </article>
        <article className="stat">
          <strong>{formatInt(view.reactions)}</strong>
          <span>Reaktioner</span>
        </article>
        <article className="stat serious">
          <strong>{formatInt(substance.views.S.reports)}</strong>
          <span>Alvorlige i alt, ikke dødsfald</span>
        </article>
        <article className="stat fatal">
          <strong>{formatInt(substance.views.F.reports)}</strong>
          <span>Dødsfald i alt</span>
        </article>
      </div>
      <p className="warning-note">
        {formatInt(substance.views.F.reports)} indberetninger er markeret som dødsfald, og{" "}
        {formatInt(all.fatalReactions)} reaktioner er markeret med fatalt udfald. Det betyder, at indberetningen
        beskriver et dødsfald. {CAUSALITY_NOTE} Tallet siger heller ikke, hvor ofte det sker.
      </p>

      <NewsSection items={news} />

      <div className="tabs" role="group" aria-label="Alvorlighed">
        {VIEWS.map((item) => (
          <button
            key={item.id}
            className="button"
            aria-pressed={viewId === item.id}
            onClick={() => setViewId(item.id)}
          >
            {item.label}
            <span className="muted"> · {formatInt(substance.views[item.id].reports)}</span>
          </button>
        ))}
      </div>

      <div className="layout">
        <section className="card stack">
          <div>
            <h2>Indberetninger over tid</h2>
            <p className="muted">
              Året er det år, Lægemiddelstyrelsen først modtog indberetningen.{" "}
              {yearPeak && viewId === "all" && (
                <>
                  Flest kom i {yearPeak.year} ({formatInt(yearPeak.reports)}, {formatPercent(yearPeak.reports, all.reports)}).
                </>
              )}
            </p>
            <YearChart years={view.years} stacked={viewId === "all"} />
            <DataTable caption="Indberetninger pr. år">
              <thead>
                <tr>
                  <th>År</th>
                  <th className="num">Ikke-alvorlig</th>
                  <th className="num">Alvorlig</th>
                  <th className="num">Dødsfald</th>
                  <th className="num">I alt</th>
                </tr>
              </thead>
              <tbody>
                {view.years.map((row) => (
                  <tr key={row.year}>
                    <td>{row.year}</td>
                    <td className="num">{formatInt(row.nonserious)}</td>
                    <td className="num">{formatInt(row.serious)}</td>
                    <td className="num">{formatInt(row.fatal)}</td>
                    <td className="num">{formatInt(row.reports)}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </div>
        </section>
        <div className="stack">
          <section className="card">
            <h2>Køn</h2>
            <RankedBars
              rows={view.sex.map((row) => ({ label: row.label, value: row.reports }))}
              total={view.reports}
            />
          </section>
          <section className="card">
            <h2>Hvem indberettede</h2>
            <p className="small muted">
              Patient/pårørende omfatter også advokat og Patienterstatningen. De to kategorier kan optræde i samme
              indberetning.
            </p>
            <RankedBars
              rows={view.reporters.map((row) => ({ label: row.label, value: row.reports }))}
              total={view.reports}
            />
          </section>
        </div>
      </div>

      <section className="card section">
        <h2>Alder</h2>
        <p className="muted">Alderen er et 10-års interval, som i Lægemiddelstyrelsens fil. Tom alder vises som ukendt.</p>
        <AgeChart ages={view.age} />
      </section>

      <section className="card section">
        <div className="substance-title">
          <div>
            <h2>Organklasse</h2>
            <p className="muted">
              MedDRA-organklasser med Lægemiddelstyrelsens danske betegnelser. En indberetning kan tælle i flere
              klasser. Navnet åbner Patienthåndbogen, når kapitlet passer til klassen. Ellers er det en søgning.
            </p>
          </div>
          <div className="tabs" aria-label="Måleenhed for organklasse">
            <button className="button" aria-pressed={metric === "reactions"} onClick={() => setMetric("reactions")}>
              Reaktioner
            </button>
            <button className="button" aria-pressed={metric === "reports"} onClick={() => setMetric("reports")}>
              Indberetninger
            </button>
          </div>
        </div>
        <RankedBars
          rows={view.soc.map((row) => {
            const link = resolveSoc(row.abbrev, row.label);
            return {
              label: row.label,
              value: metric === "reactions" ? row.reactions : row.reports,
              href: link.href,
              search: link.search,
              source: link.source,
            };
          })}
        />
        <DataTable caption="Organklasser">
          <thead>
            <tr>
              <th>Organklasse</th>
              <th className="num">Reaktioner</th>
              <th className="num">Indberetninger</th>
              <th className="num">Fatale reaktioner</th>
            </tr>
          </thead>
          <tbody>
            {view.soc.map((row) => (
              <tr key={row.abbrev}>
                <td>
                  <SocName abbrev={row.abbrev} label={row.label} />
                </td>
                <td className="num">{formatInt(row.reactions)}</td>
                <td className="num">{formatInt(row.reports)}</td>
                <td className="num">{formatInt(row.fatalReactions)}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </section>

      <TermTable view={view} query={termQuery} onQuery={setTermQuery} />

      <div className="layout">
        <section className="card">
          <h2>Administrationsvej</h2>
          <p className="small muted">
            Tallet for indberetninger er sager, hvor vejen optræder mindst én gang. Administrationer tæller hver
            række i drug.csv. Veje med få sager er slået sammen af Lægemiddelstyrelsen.
          </p>
          <RankedBars rows={view.routes.map((row) => ({ label: row.label, value: row.reports }))} />
          <DataTable caption="Administrationsveje">
            <thead>
              <tr>
                <th>Vej</th>
                <th className="num">Indberetninger</th>
                <th className="num">Administrationer</th>
              </tr>
            </thead>
            <tbody>
              {view.routes.map((row) => (
                <tr key={row.key}>
                  <td>
                    {row.label}
                    {row.label !== row.key && <span className="muted"> · {row.key}</span>}
                  </td>
                  <td className="num">{formatInt(row.reports)}</td>
                  <td className="num">{formatInt(row.administrations)}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </section>
        <section className="card" id="praeparater">
          <h2>Handelsnavne og firmaer</h2>
          <p className="small muted">{SUBSTANCE_COUNT_NOTE}</p>
          {identity && identity.companies.length > 0 && (
            <p>
              <span className="identity-label">Indehavere</span>{" "}
              {identity.companies.map((company, index) => (
                <span key={company.slug}>
                  {index > 0 ? ", " : ""}
                  <Link href={`/firma/${company.slug}`}>{company.label}</Link>
                </span>
              ))}
            </p>
          )}
          {identity && identity.brands.length > 0 && (
            <p>
              {identity.brands.join(", ")}
              {identity.brandCount > identity.brands.length ? ` +${identity.brandCount - identity.brands.length} flere` : ""}
            </p>
          )}
          <h3>Produktnavne i udtrækket</h3>
          <p className="small muted">
            Listen er de navne, Lægemiddelstyrelsen har lagt i bivirkningsoversigten. Den siger ikke, hvor mange
            indberetninger hvert navn står på.
          </p>
          {substance.brands.length > 0 && (
            <p className="brand-cloud" aria-label="Navne">
              {substance.brands.map((brand) => (
                <span key={brand}>{brand}</span>
              ))}
            </p>
          )}
          <details>
            <summary>
              Enkeltstof-produkter ({formatInt(substance.productNames.single.length)})
            </summary>
            <p>{substance.productNames.single.join(", ") || "Ingen"}</p>
          </details>
          <details>
            <summary>Kombinationsprodukter ({formatInt(substance.productNames.multi.length)})</summary>
            <p>{substance.productNames.multi.join(", ") || "Ingen"}</p>
          </details>
          <p>
            <Link href={`/katalog?stof=${substance.slug}`}>
              {formatInt(substance.approvedProductCount)} godkendte præparatrækker peger på dette stof
            </Link>
          </p>
          <p className="small muted">
            MedDRA {substance.meddraVersion}. Udtræksversion {substance.extractVersion}. Niveau: {substance.reportType}.
          </p>
        </section>
      </div>
    </>
  );
}

function PlainIntro({ plain }: { plain: PlainLanguage }) {
  const needsReview = plain.needsReview || plain.className.needsReview || plain.use.needsReview;
  return (
    <div className="plain-intro">
      {plain.className.value && <p className="plain-class">{plain.className.value}</p>}
      {plain.use.value && <p>{plain.use.value}</p>}
      {plain.indication.value && <p>{plain.indication.value}</p>}
      {needsReview && <p className="review-flag">Automatisk udfyldt ud fra ATC-gruppen. Skal gennemses.</p>}
      <p className="small muted">Kilde: {plain.use.source}</p>
    </div>
  );
}

function SummaryCard({ substance }: { substance: Substance }) {
  const all = substance.views.all;
  const nonserious = substance.views.N.reports;
  const serious = substance.views.S.reports;
  const fatal = substance.views.F.reports;
  const rows = ageBySeriousness(substance);
  const known = rows.filter((row) => row.label !== "Ukendt");
  const busiest = [...known].sort((a, b) => b.nonserious + b.serious + b.fatal - (a.nonserious + a.serious + a.fatal))[0];
  const unknown = rows.find((row) => row.label === "Ukendt");
  const unknownCount = unknown ? unknown.nonserious + unknown.serious + unknown.fatal : 0;

  let overview = "Der er ingen indberetninger i dette udtræk.";
  if (all.reports > 0) {
    const fatalClause =
      fatal === 0
        ? "Ingen er registreret som dødsfald."
        : `${formatInt(fatal)} er registreret som dødsfald.`;
    const ageClause = busiest
      ? ` Flest med kendt alder er i gruppen ${busiest.label} (${formatInt(busiest.nonserious + busiest.serious + busiest.fatal)}).`
      : "";
    const unknownClause =
      unknownCount > 0 ? ` ${formatInt(unknownCount)} har ikke oplyst alder.` : " Alle har en oplyst alder.";
    overview = `Af ${formatInt(all.reports)} indberetninger er ${formatInt(nonserious)} ikke-alvorlige og ${formatInt(serious)} alvorlige. ${fatalClause}${ageClause}${unknownClause}`;
  }

  return (
    <section className="card resume" aria-labelledby="resume-heading">
      <p className="kicker">Resumé</p>
      <h2 id="resume-heading">Det korte overblik</h2>
      <p>{overview}</p>
      <div className="resume-grid">
        <ul className="resume-figures">
          <li>
            <span>Ikke-alvorlige</span>
            <strong>{formatInt(nonserious)}</strong>
          </li>
          <li>
            <span>Alvorlige</span>
            <strong>{formatInt(serious)}</strong>
          </li>
          <li>
            <span>Dødsfald</span>
            <strong>{formatInt(fatal)}</strong>
          </li>
        </ul>
        <div>
          <p className="legend" aria-hidden="true">
            <span><i className="swatch ns" /> Ikke-alvorlig</span>
            <span><i className="swatch serious" /> Alvorlig</span>
            <span><i className="swatch fatal" /> Dødsfald</span>
          </p>
          <AgeSeriousnessChart rows={rows} />
        </div>
      </div>
      <p className="small muted">
        Alderen er Lægemiddelstyrelsens 10-årsintervaller. Søjlerne er antal indberetninger, ikke en hyppighed.{" "}
        {CAUSALITY_NOTE}
      </p>
      <details>
        <summary>Vis tabel: alder og alvorlighed</summary>
        <div className="table-scroll">
          <table>
            <caption className="sr-only">Indberetninger pr. aldersgruppe og alvorlighed</caption>
            <thead>
              <tr>
                <th>Alder</th>
                <th className="num">Ikke-alvorlig</th>
                <th className="num">Alvorlig</th>
                <th className="num">Dødsfald</th>
                <th className="num">I alt</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <td>{row.label}</td>
                  <td className="num">{formatInt(row.nonserious)}</td>
                  <td className="num">{formatInt(row.serious)}</td>
                  <td className="num">{formatInt(row.fatal)}</td>
                  <td className="num">{formatInt(row.nonserious + row.serious + row.fatal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}

function ageBySeriousness(substance: Substance): AgeSeriousnessRow[] {
  const bands = new Map<string, AgeSeriousnessRow>();
  const take = (rows: { band: string | null; label: string; reports: number }[], field: "nonserious" | "serious" | "fatal") => {
    for (const row of rows) {
      const key = row.band ?? "unknown";
      const current = bands.get(key) ?? { label: row.label, nonserious: 0, serious: 0, fatal: 0 };
      current[field] = row.reports;
      bands.set(key, current);
    }
  };
  take(substance.views.N.age, "nonserious");
  take(substance.views.S.age, "serious");
  take(substance.views.F.age, "fatal");
  return [...bands.entries()]
    .sort((a, b) => ageSort(a[0]) - ageSort(b[0]))
    .map(([, row]) => row);
}

function ageSort(band: string): number {
  if (band === "unknown") return 1000;
  const value = Number(band);
  return Number.isFinite(value) ? value : 900;
}

function NewsSection({ items }: { items: NewsItem[] }) {
  return (
    <section className="card section" aria-labelledby="dkma-nyheder">
      <h2 id="dkma-nyheder">Nyheder fra Lægemiddelstyrelsen</h2>
      <p className="muted">
        Overskrift, dato og den korte manchet fra Lægemiddelstyrelsen. Linket åbner artiklen hos dem. Hele
        teksten bliver ikke kopieret hertil.
      </p>
      {items.length === 0 ? (
        <p>Ingen nyheder nævner dette stof eller dets handelsnavne i overskriften eller manchetten.</p>
      ) : (
        <ul className="news-list">
          {items.map((item) => (
            <li key={item.url}>
              <p className="news-date">{item.dateLabel}</p>
              <a href={item.url} rel="noopener noreferrer">
                {item.title}
              </a>
              {item.excerpt ? <p className="muted">{item.excerpt}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function WordLink({
  text,
  href,
  search,
  source,
}: {
  text: string;
  href: string;
  search: boolean;
  source: string | null;
}) {
  const label = search ? `${text}. Søgning i Patienthåndbogen` : `${text}. Forklaring hos ${source ?? "kilden"}`;
  return (
    <a className="term-link" href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label}>
      {text}
      {search ? <span className="tag quiet">Søg</span> : null}
    </a>
  );
}

function TermName({ english }: { english: string }) {
  const link = resolveTerm(english);
  const note = englishSourceNote(link);
  const sameName = link.danish?.toLocaleLowerCase("da-DK") === english.toLocaleLowerCase("en");
  return (
    <span className="term-name">
      {link.href ? (
        <WordLink text={link.danish ?? english} href={link.href} search={link.search} source={link.source} />
      ) : (
        <span>{link.danish ?? english}</span>
      )}
      {link.danish && !sameName ? <span className="term-en">{english}</span> : null}
      {note ? <span className="term-en">{note}</span> : null}
    </span>
  );
}

function SocName({ abbrev, label }: { abbrev: string; label: string }) {
  const link = resolveSoc(abbrev, label);
  if (!link.href) return <span>{label}</span>;
  return <WordLink text={label} href={link.href} search={link.search} source={link.source} />;
}

function downloadSubstance(substance: Substance) {
  const blob = new Blob([JSON.stringify(substance)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${substance.slug}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function TermTable({
  view,
  query,
  onQuery,
}: {
  view: SubstanceView;
  query: string;
  onQuery: (value: string) => void;
}) {
  const socByAbbrev = useMemo(() => new Map(view.soc.map((row) => [row.abbrev, row.label])), [view.soc]);
  const rows = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("da-DK");
    const filtered = needle
      ? view.terms.filter((term) => {
          const danish = resolveTerm(term.pt).danish?.toLocaleLowerCase("da-DK") ?? "";
          const soc = (socByAbbrev.get(term.soc) ?? term.soc).toLocaleLowerCase("da-DK");
          return (
            term.pt.toLocaleLowerCase("en").includes(needle) ||
            danish.includes(needle) ||
            term.soc.toLocaleLowerCase("en").includes(needle) ||
            soc.includes(needle)
          );
        })
      : view.terms;
    return filtered.slice(0, 80);
  }, [query, socByAbbrev, view.terms]);

  return (
    <section className="card section" id="foretrukne-termer">
      <h2>Foretrukne termer</h2>
      <p className="muted">
        Termen står på engelsk, fordi det er sådan, den står i Lægemiddelstyrelsens fil. Et dansk navn vises ved siden
        af, når det er en almindelig betegnelse. Linket åbner en forklaring i Patienthåndbogen på sundhed.dk, eller hos
        MedlinePlus eller NHS, hvis der ikke er en dansk side. «Søg» er kun en søgning, ikke en gennemgået artikel.
        Forklaringen siger ikke, at medicinen forårsagede reaktionen. En reaktion er én række, og samme indberetning kan
        have flere.
      </p>
      <div className="term-tools">
        <input
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Filtrér termer, fx hovedpine eller nausea"
          aria-label="Filtrér foretrukne termer"
        />
        <span className="muted small">
          Viser {formatInt(rows.length)} af {formatInt(view.terms.length)}
        </span>
      </div>
      <div className="table-scroll">
        <table>
          <caption className="sr-only">Foretrukne MedDRA-termer</caption>
          <thead>
            <tr>
              <th>Term</th>
              <th>Organklasse</th>
              <th className="num">Reaktioner</th>
              <th className="num">Indberetninger</th>
              <th className="num">Fatale</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.soc}-${row.pt}`}>
                <td>
                  <TermName english={row.pt} />
                </td>
                <td>
                  <SocName abbrev={row.soc} label={socByAbbrev.get(row.soc) ?? row.soc} />
                </td>
                <td className="num">{formatInt(row.reactions)}</td>
                <td className="num">{formatInt(row.reports)}</td>
                <td className="num">{formatInt(row.fatalReactions)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RankedBars({
  rows,
  total,
}: {
  rows: { label: string; value: number; href?: string | null; search?: boolean; source?: string | null }[];
  total?: number;
}) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  if (rows.length === 0) return <p className="muted">Ingen tal i dette udsnit.</p>;
  return (
    <div className="bars">
      {rows.map((row) => (
        <div className="bar-row" key={row.label}>
          <div className="bar-label">
            {row.href ? (
              <WordLink text={row.label} href={row.href} search={Boolean(row.search)} source={row.source ?? null} />
            ) : (
              row.label
            )}
          </div>
          <div className="bar-track" aria-hidden="true">
            <span className="bar-fill" style={{ width: `${(row.value / max) * 100}%` }} />
          </div>
          <div className="bar-value">
            {formatInt(row.value)}
            {total ? ` · ${formatPercent(row.value, total)}` : ""}
          </div>
        </div>
      ))}
    </div>
  );
}

function DataTable({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <details>
      <summary>Vis tabel: {caption}</summary>
      <div className="table-scroll">
        <table>
          <caption className="sr-only">{caption}</caption>
          {children}
        </table>
      </div>
    </details>
  );
}
