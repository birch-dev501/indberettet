import type { Metadata } from "next";
import Link from "next/link";
import { ReportIssue } from "@/components/report-issue";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { CAUSALITY_NOTE } from "@/lib/rates";
import { getStatus } from "@/lib/data";
import { formatDate, formatInt } from "@/lib/format";

export const metadata: Metadata = {
  title: "Om data",
  description: "Hvad Lægemiddelstyrelsens bivirkningsfiler indeholder, og hvordan siden opdateres.",
};

export default function AboutPage() {
  const status = getStatus();
  const failures = status.failed ?? [];
  return (
    <>
      <SiteHeader current="om" />
      <main id="indhold" className="wrap page-head">
        <p className="kicker">Metode</p>
        <h1>Hvad tallene er, og hvad de ikke er.</h1>
        <p className="lede">
          Kilden er Lægemiddelstyrelsens interaktive bivirkningsoversigter. Hvert stof leveres som en ZIP med fem
          CSV-filer og en forklaring. Teksten herunder gengiver styrelsens egen forklaring.
        </p>

        <section className="section stack">
          <article className="card">
            <h2>Formodede bivirkninger</h2>
            <p>{CAUSALITY_NOTE}</p>
            <p>
              Læger, patienter og pårørende kan indberette, når de har en formodning om, at et symptom hænger
              sammen med medicin. Styrelsen bruger indberetningerne som ét af flere grundlag, når de vurderer
              sikkerheden.
            </p>
            <p>
              Oversigterne kan ikke måle risiko. De kender ikke, hvor mange der har taget medicinen uden
              at indberette noget. Ikke alle formodede bivirkninger bliver meldt, og andelen varierer mellem
              lægemidler. Derfor kan to stoffer ikke sammenlignes ved at stille tallene ved siden af hinanden. En
              indberetning kan desuden nævne flere lægemidler og så stå i flere oversigter.
            </p>
            <p>
              Kendte bivirkninger og den samlede evidens står i produktinformationen. Spørgsmål om din egen medicin
              hører hjemme hos lægen eller på apoteket. Hvordan en relativ reduktion i et forsøg adskiller sig fra
              disse indberetninger, står under <Link href="/forstaa-forskning">forsøgstal</Link>.
            </p>
            <p>
              Handelsnavne og firmaer kommer fra listen over godkendte lægemidler. Indberetningerne er talt for det
              aktive stof. Oversigten siger ikke, hvor mange der gælder ét handelsnavn frem for et andet.
            </p>
          </article>
          <article className="card">
            <h2>Filernes felter</h2>
            <p>Hver ZIP indeholder, som styrelsens hjælpetekst beskriver:</p>
            <ul>
              <li>
                <strong>case.csv</strong>. Én række pr. indberetning. Felterne er køn, aldersbånd, modtagelsesår, om
                indberetteren er patient/pårørende og/eller sundhedsperson, og alvorlighed (ikke-alvorlig,
                alvorlig eller dødsfald).
              </li>
              <li>
                <strong>drug.csv</strong>. Hvordan stoffet blev givet. Veje med få indberetninger er slået sammen.
              </li>
              <li>
                <strong>event.csv</strong>. Reaktionerne i MedDRA (foretrukken term og organklasse) og om den
                enkelte reaktion var fatal.
              </li>
              <li>
                <strong>summary.csv</strong>. Produktnavne i udtrækket, uden antal pr. navn.
              </li>
              <li>
                <strong>info.csv</strong>. Stofnavn, udtræksdato, MedDRA-version og land.
              </li>
            </ul>
            <p>
              Alder 0 betyder 0–9 år, 10 betyder 10–19 år, og så videre. Patient og sundhedsperson kan begge være
              markeret på samme sag. Organklassernes danske navne er styrelsens egne betegnelser. De engelske
              termer er ikke oversat.
            </p>
          </article>
          <article className="card">
            <h2>Fra produktliste til ZIP</h2>
            <p>
              Hver måned henter pipelinen{" "}
              <a href={status.listUrl}>listen over godkendte lægemidler</a> og stofindekset bag de interaktive
              oversigter. Aktive stoffer matches til en oversigt. Saltnavne og latinske endelser som -um foldes
              ind, men et tvetydigt navn bliver ikke gættet. COVID-19 vaccines og Semaglutide hentes altid, også
              hvis navnet på produktlisten ikke rammer.
            </p>
            <p>
              Denne kørsel: {formatInt(status.list.productRows)} præparatrækker,{" "}
              {formatInt(status.uniqueSubstanceTokens)} forskellige stofnavne, {formatInt(status.matchedTokens)}{" "}
              matchet, {formatInt(status.succeeded)} ZIP-filer valideret. {formatInt(status.products.covered)}{" "}
              præparater er dækket helt. Kataloget havde {formatInt(status.catalogCount)} oversigter.
            </p>
            <p>
              Udtræksdatoer i de hentede filer spænder fra {formatDate(status.dataExtractionDateMin)} til{" "}
              {formatDate(status.dataExtractionDateMax)}. Styrelsen skriver selv, at et stof med få nye
              indberetninger kan beholde en ældre dato.
            </p>
            {failures.length > 0 ? (
              <>
                <h3>Filer der ikke kom med</h3>
                <ul>
                  {failures.slice(0, 30).map((failure) => (
                    <li key={failure.id}>
                      {failure.name}: {failure.reason}
                      {failure.retainedPrevious ? " Sidste gyldige fil er beholdt." : ""}
                    </li>
                  ))}
                </ul>
                {failures.length > 30 && <p>Og {formatInt(failures.length - 30)} flere. Se data/status.json.</p>}
              </>
            ) : (
              <p>Ingen ZIP-filer fejlede i seneste kørsel.</p>
            )}
          </article>
          <article className="card">
            <h2>Månedlig opdatering</h2>
            <p>
              GitHub Actions kører <code>python scripts/ingest.py</code> den 2. i hver måned kl. 05.30 UTC og kan
              også startes manuelt under Actions → «Månedlig opdatering» → Run workflow. Jobbet henter
              produktlisten igen, så nye præparater kommer med, henter nyhedslisten og validerer CSV-skemaet.
              Lykkes det, og tallene eller nyhederne er ændret, committes det og GitHub Pages udgives igen. En
              uændret kørsel udgiver ikke på ny. Kan nyhedslisten ikke læses, beholdes sidste gyldige nyheder, og
              lægemiddeldata opdateres stadig.
            </p>
            <p>
              Jobbet stopper med fejl, hvis downloadet fejler, eller hvis filerne ikke længere ligner det dokumenterede format.
              Det sker især, hvis Semaglutide eller COVID-19 vaccines ikke kan valideres, eller hvis en stor del af filerne bryder skemaet. Den forrige mappe med data bliver liggende, og sitet fortsætter på sidste gyldige
              udtræk. En enkelt ødelagt ZIP holder ikke de andre tilbage: den stofside beholder sin gamle fil og
              markeres som forældet.
            </p>
            <p>
              Lokalt: <code>python scripts/ingest.py</code>. Kun match, uden download:{" "}
              <code>python scripts/ingest.py --dry-run</code>.
            </p>
          </article>
          <article className="card">
            <h2>Fandt du en fejl?</h2>
            <p>
              Mangler et lægemiddel, eller stemmer et tal ikke, så skriv det som en sag. {""}
              <ReportIssue />
            </p>
          </article>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
