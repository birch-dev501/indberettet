import Link from "next/link";
import { SearchPanel } from "@/components/search-panel";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SubstanceIdentityLine } from "@/components/substance-identity";
import { CAUSALITY_NOTE } from "@/lib/rates";
import { getCategories, getCompanyCatalog, getDiseases, getIndex, getPlainLanguage, getStatus } from "@/lib/data";
import { formatDate, formatInt, formatPercent } from "@/lib/format";

export default function HomePage() {
  const index = getIndex();
  const status = getStatus();
  const featured = index.substances.filter((item) => item.showcase);
  const categories = getCategories();
  const diseases = getDiseases();
  const plain = getPlainLanguage();
  const identities = getCompanyCatalog().bySlug;
  const updated =
    index.dataExtractionDateMin &&
    index.dataExtractionDateMax &&
    index.dataExtractionDateMin !== index.dataExtractionDateMax
      ? `${formatDate(index.dataExtractionDateMin)} – ${formatDate(index.dataExtractionDateMax)}`
      : formatDate(index.dataExtractionDateMax);

  return (
    <>
      <SiteHeader current="home" />
      <main id="indhold">
        <section className="hero">
          <div className="wrap hero-grid">
            <div>
              <p className="kicker">Lægemiddelstyrelsen · åbne tal</p>
              <h1>Formodede bivirkninger, læst langsomt.</h1>
              <p className="lede">
                Indberettet viser de indberetninger, Lægemiddelstyrelsen offentliggør om medicin i Danmark.{" "}
                {CAUSALITY_NOTE} Tallene er heller ikke en risiko for den, der tager medicinen.
              </p>
              <p className="date-pill">
                Data opdateret <time dateTime={index.dataExtractionDateMax ?? undefined}>{updated}</time>
                <span className="muted">· hentet {formatDate(status.generatedAt)}</span>
              </p>
            </div>
            <div className="card">
              <p className="kicker">Denne udgave</p>
              <p>
                <strong>{formatInt(status.products.rows)}</strong> præparatrækker fra listen over godkendte
                lægemidler.
              </p>
              <p>
                <strong>{formatInt(status.succeeded)}</strong> stoffer har en bivirkningsoversigt og er hentet.
              </p>
              <p className="small muted">
                {formatInt(status.products.covered)} præparater er dækket helt,{" "}
                {formatInt(status.products.partial)} delvist, {formatInt(status.products.uncovered)} har ingen
                oversigt hos styrelsen.
              </p>
            </div>
          </div>
        </section>

        <section className="wrap">
          <div className="showcase-grid">
            {featured.map((item) => {
              const label = plain[item.slug];
              return (
              <Link key={item.slug} href={`/stof/${item.slug}`} className="card showcase">
                <div>
                  <p className="kicker">{label?.className.value || "Fremhævet stof"}</p>
                  <h2>{item.name}</h2>
                  <SubstanceIdentityLine identity={identities[item.slug]} moreHref={`/stof/${item.slug}#praeparater`} linked={false} />
                  <p>{label?.className.value || "Aktivt stof i Lægemiddelstyrelsens oversigt."}</p>
                </div>
                <div>
                  <div className="metric-row">
                    <p className="metric">
                      <strong>{formatInt(item.reports)}</strong>
                      <span>indberetninger</span>
                    </p>
                    <p className="metric">
                      <strong>{formatInt(item.seriousReports)}</strong>
                      <span>alvorlige</span>
                    </p>
                    <p className="metric">
                      <strong>{formatInt(item.fatalReports)}</strong>
                      <span>om dødsfald</span>
                    </p>
                  </div>
                  <p className="arrow">Åbn oversigten</p>
                </div>
              </Link>
              );
            })}
          </div>
        </section>

        <section className="wrap section">
          <div className="section-head">
            <h2>Find medicin efter sygdom</h2>
            <p className="muted">
              Ordene peger på ATC-grupper, ikke på en godkendt indikation.{" "}
              <Link href="/sygdom">Se sygdomsordene</Link>.
            </p>
          </div>
          <div className="category-grid">
            {diseases.map((disease) => (
              <Link key={disease.slug} href={`/sygdom/${disease.slug}`} className="card category-card">
                <p className="kicker">ATC {disease.atcPrefixes.join(", ")}</p>
                <h3>{disease.name}</h3>
                <p className="small">{disease.summary}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="wrap section">
          <div className="section-head">
            <h2>Grupper efter ATC</h2>
            <p className="muted">
              Grupperne følger koder på listen over godkendte lægemidler.{" "}
              <Link href="/kategori">Se alle grupper</Link>.
            </p>
          </div>
          <div className="category-grid">
            {categories.map((category) => (
              <Link key={category.slug} href={`/kategori/${category.slug}`} className="card category-card">
                <p className="kicker">ATC {category.atc}</p>
                <h3>{category.name}</h3>
                <p className="small muted">
                  {formatInt(category.members.length)} stoffer · {formatInt(category.reports)} indberetninger
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="wrap section">
          <div className="caveat-grid">
            <article className="caveat">
              <h3>En mistanke, ikke en dom</h3>
              <p>{CAUSALITY_NOTE}</p>
            </article>
            <article className="caveat">
              <h3>Ikke en hyppighed</h3>
              <p>
                Registrene ved ikke, hvor mange der har taget medicinen uden at mærke noget. Tallene kan ikke
                sige, hvor stor risikoen er, og to stoffer kan ikke sammenlignes på den måde.
              </p>
            </article>
            <article className="caveat">
              <h3>Kendte bivirkninger står et andet sted</h3>
              <p>
                Den samlede viden om et lægemiddel står i produktresume og indlægsseddel. Er du i tvivl om din
                medicin, så tal med lægen eller apoteket.
              </p>
            </article>
          </div>
        </section>

        <section className="wrap section">
          <div className="layout">
            <div className="card">
              <h2>Find et stof eller et præparat</h2>
              <p className="muted">
                Søgningen dækker de stoffer, vi har hentet, og præparaterne på Lægemiddelstyrelsens liste over
                godkendte lægemidler.
              </p>
              <SearchPanel />
            </div>
            <aside className="card">
              <h2>Sådan læses et tal</h2>
              <p>
                {featured[0] ? (
                  <>
                    For {featured[0].name} er der {formatInt(featured[0].reports)} indberetninger.{" "}
                    {formatPercent(featured[0].fatalReports, featured[0].reports)} af dem er registreret som
                    dødsfald. Den hyppigst nævnte term i filen er {featured[0].topTerm ?? "ikke oplyst"}.
                  </>
                ) : (
                  "Når data er hentet, vises et eksempel her."
                )}
              </p>
              <p>
                <Link href="/om-data">Læs hvad filerne indeholder, og hvad de ikke kan bruges til.</Link>
              </p>
            </aside>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
