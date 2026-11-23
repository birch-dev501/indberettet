import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { effectsForSubstance } from "@/lib/effect-records";
import { loadCovidHarms, measureText, type HarmFinding, type HarmGroupId } from "@/lib/covid-harms";

export const metadata: Metadata = {
  title: "Hvad siger studierne om bivirkninger ved covid-vacciner",
  description:
    "Absolutte risici for navngivne grupper fra studier og fra EMA's produktinformation. Indberetninger er ikke en hyppighed.",
};

export default function CovidHarmPage() {
  const file = loadCovidHarms();
  const comirnaty = effectsForSubstance("covid-19-vaccines").find((item) => item.record.id === "c4591001-primary");
  const byGroup = (id: HarmGroupId) => file.findings.filter((item) => item.group === id);
  return (
    <>
      <SiteHeader />
      <main id="indhold" className="wrap page-head">
        <p className="kicker">Studier. Ikke indberetninger.</p>
        <h1>Hvad siger studierne om bivirkninger ved covid-vacciner?</h1>
        <p className="lede">
          Tallene er absolutte risici for en navngiven gruppe, taget fra studiet eller fra produktinformationen. En
          indberetning til Lægemiddelstyrelsen, EudraVigilance eller VAERS er en mistanke. Den er ikke en hyppighed.
        </p>

        <article className="card section">
          <h2>Hvorfor 1.000 studier ikke måler skaden</h2>
          <p>
            En lang referenceliste viser, at mange har skrevet om emnet. Den viser ikke, hvor ofte en skade sker. Et
            enkelt patientforløb og et lodtrækningsforsøg vejer ikke lige tungt. Nogle af artiklerne finder ingen
            sammenhæng.
          </p>
        </article>

        {file.groups.map((group) => (
          <section className="section stack" key={group.id}>
            <h2>{group.title}</h2>
            <p>{group.lead}</p>
            {byGroup(group.id).map((finding) => (
              <Finding key={finding.id} finding={finding} />
            ))}
          </section>
        ))}

        <article className="card section">
          <h2>Gavn i et andet udfald</h2>
          {comirnaty?.nnt ? (
            <p>
              I godkendelsesforsøget med Comirnaty skulle der vaccineres {comirnaty.nnt} personer for at forebygge ét
              tilfælde af symptomgivende covid-19 i den korte opfølgning i 2020. Det er et andet udfald end betændelse i
              hjertemusklen. Tallene kan ikke trækkes fra hinanden.{" "}
              <Link href="/stof/covid-19-vaccines/#effekt-c4591001-primary">Kortet med regnestykket</Link>.
            </p>
          ) : (
            <p>Effektkortet for Comirnaty mangler, så NNT vises ikke her.</p>
          )}
        </article>

        <p className="small muted">
          <Link href="/stof/covid-19-vaccines/">Tilbage til indberetningerne for covid-vacciner</Link>.{" "}
          <Link href="/forstaa-forskning/">Sådan læses en relativ og en absolut forskel</Link>.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}

function Finding({ finding }: { finding: HarmFinding }) {
  const links = [
    ...finding.measures.map((measure) => ({ name: measure.sourceName, url: measure.sourceUrl })),
    ...(finding.links ?? []),
  ].filter((link, index, all) => all.findIndex((item) => item.url === link.url) === index);
  return (
    <article className="card">
      <h3>{finding.heading}</h3>
      <p>{finding.body}</p>
      {finding.measures.map((measure) => (
        <p key={measure.id}>
          {measureText(measure)} {measure.place}
        </p>
      ))}
      <ul>
        {links.map((link) => (
          <li key={link.url}>
            <a href={link.url} rel="noopener noreferrer">
              {link.name}
            </a>
          </li>
        ))}
      </ul>
    </article>
  );
}
