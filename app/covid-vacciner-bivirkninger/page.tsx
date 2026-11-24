import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { effectsForSubstance } from "@/lib/effect-records";
import { loadCovidHarms, measureText, sourceUnitNote, type HarmFinding, type HarmGroupId } from "@/lib/covid-harms";

export const metadata: Metadata = {
  title: "Hvad siger studierne om bivirkninger ved covid-vacciner",
  description:
    "Studierne sorteret efter dokumentation. Merrisiko som absolut tal pr. million. Indberetninger er ikke en hyppighed.",
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
          Siden sorterer studierne efter, hvor godt fundet er dokumenteret. De tre kasser er evidensniveauer: Etableret,
          Signal og Ikke understøttet. Signal betyder, at fundet kræver nærmere undersøgelse. Merrisiko vises som et
          absolut tal pr. million. Enheden fra kilden står i noten under tallet. Tallet gælder gruppen ved tallet. Et
          forholdstal står som et forholdstal. En indberetning til Lægemiddelstyrelsen, EudraVigilance eller VAERS er en
          mistanke, ikke en hyppighed.
        </p>

        {file.preface ? (
          <article className="card section">
            <h2>{file.preface.title}</h2>
            <p>{file.preface.body}</p>
            <p>
              <a href={file.preface.sourceUrl} rel="noopener noreferrer">
                {file.preface.sourceName}
              </a>
              .
            </p>
          </article>
        ) : null}

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
              tilfælde af symptomgivende covid-19 i den korte opfølgning i 2020. Tallet gælder deltagerne fra 16 år, ikke
              kun den unge gruppe, hvor betændelse i hjertemusklen er hyppigst. Det er et andet udfald. Tallene kan ikke
              trækkes fra hinanden.{" "}
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
      {finding.measures.map((measure, index) => {
        const previous = finding.measures[index - 1]?.block;
        return (
          <p key={measure.id}>
            {measure.block && measure.block !== previous ? <strong>{measure.block}. </strong> : null}
            {measureText(measure)}{" "}
            {sourceUnitNote(measure) ? <span className="small muted">{sourceUnitNote(measure)}</span> : null}
          </p>
        );
      })}
      {finding.note ? <p>{finding.note}</p> : null}
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
