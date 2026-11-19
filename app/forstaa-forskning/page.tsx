import type { Metadata } from "next";
import Link from "next/link";
import { EffectCalculator } from "@/components/effect-calculator";
import { IconArray } from "@/components/icon-array";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { BNT162B2, trialRisks } from "@/lib/effects";

export const metadata: Metadata = {
  title: "Sådan læser du industriens resultater",
  description:
    "Relativ og absolut risikoreduktion, NNT og NNH, forklaret med tallene fra fase 3-forsøget med BNT162b2.",
};

const POLACK = "https://www.nejm.org/doi/full/10.1056/NEJMoa2034577";
const OLLIARO = "https://www.thelancet.com/journals/lanmic/article/PIIS2666-5247(21)00069-0/fulltext";
const OLLIARO_CORRECTION = "https://pmc.ncbi.nlm.nih.gov/articles/PMC9247853/";

export default function ResearchLiteracyPage() {
  const { measures } = trialRisks();
  const rrr = (measures.rrr! * 100).toLocaleString("da-DK", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  const arr = (measures.arr * 100).toLocaleString("da-DK", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  const perThousandPlacebo = (BNT162B2.placeboCases / BNT162B2.placeboN) * 1000;
  const perThousandVaccine = (BNT162B2.vaccinatedCases / BNT162B2.vaccinatedN) * 1000;

  return (
    <>
      <SiteHeader current="forskning" />
      <main id="indhold" className="wrap page-head">
        <p className="kicker">Forsøgstal</p>
        <h1>Sådan læser du industriens resultater.</h1>
        <p className="lede">
          En overskrift siger ofte, at et lægemiddel nedsætter risikoen med 95 %. Det tal er næsten altid den relative
          reduktion. Det siger, hvor stor en andel af de tilfælde, der ellers ville være sket, der udeblev. Det siger
          ikke, hvor mange mennesker der faktisk undgik noget.
        </p>

        <section className="section stack">
          <article className="card">
            <h2>Fire tal for det samme forsøg</h2>
            <p>
              <strong>Udgangsrisiko</strong> er, hvor ofte udfaldet sker uden den nye behandling. I et lodtrækningsforsøg
              er det andelen i placebogruppen i den periode, forsøget dækker.
            </p>
            <p>
              <strong>Relativ risikoreduktion (RRR)</strong> er forskellen mellem de to grupper divideret med risikoen i
              kontrolgruppen. Vaccineeffekt i de store covid-19-forsøg er denne størrelse: 100 × (1 − relativ risiko).
            </p>
            <p>
              <strong>Absolut risikoreduktion (ARR)</strong> er risikoen uden behandling minus risikoen med behandling,
              i procentpoint. Den afhænger af udgangsrisikoen. Samme relative reduktion giver en stor absolut forskel,
              når udfaldet er almindeligt, og en lille, når det er sjældent.
            </p>
            <p>
              <strong>Number needed to treat (NNT)</strong> er 1 divideret med den absolutte forskel. Det er hvor mange
              der skal behandles, i gennemsnit og i netop den periode, for at én person undgår udfaldet.{" "}
              <strong>Number needed to harm (NNH)</strong> er det samme regnestykke, når behandlingen øger risikoen.
            </p>
          </article>

          <article className="card">
            <h2>Hvorfor overskriften næsten altid er den relative</h2>
            <p>
              Protokollen for et vaccineforsøg definerer effekt som den relative reduktion. 95 % er et stort tal og
              kan sammenlignes på tværs af forsøg, også når smitten i baggrunden er forskellig. Den absolutte forskel
              kan ikke det. Den hører til den smitte, der faktisk var, mens forsøget stod på.
            </p>
            <p>
              Et interval omkring effekten, i artiklerne et konfidensinterval eller et credibility interval, beskriver
              usikkerheden på estimatet. Et smalt interval omkring en høj relativ reduktion kan godt høre sammen med en
              absolut forskel på under ét procentpoint. Intervallet flytter ikke udgangsrisikoen.
            </p>
            <p>
              <strong>Surrogat eller hårdt udfald.</strong> Et surrogat er et mål, man håber står i stedet for det,
              patienten mærker: et antistof, et blodtryk, en billedscanning. Et hårdt udfald er selve sygdommen,
              indlæggelsen eller dødsfaldet. Et forsøg kan have et klinisk udfald og alligevel ikke sige noget om de
              sjældneste følger, hvis de næsten ikke nåede at indtræffe.
            </p>
            <p>
              <strong>Varighed.</strong> NNT gælder den opfølgning, tallene er talt over. Et kort forsøg med lav smitte
              giver et højt NNT, også når den relative reduktion er høj. Et senere år med anden smitte giver et andet
              NNT, selv om den relative effekt er den samme.
            </p>
          </article>

          <article className="card" id="bnt162b2">
            <h2>Eksempel: BNT162b2, fase 3</h2>
            <p>
              Polack og kolleger offentliggjorde forsøget med Pfizer og BioNTechs vaccine BNT162b2 i New England Journal
              of Medicine i 2020. Det første primære udfald var laboratoriebekræftet, symptomgivende covid-19 med start
              mindst 7 dage efter andet stik, hos deltagere uden tegn på tidligere infektion. Det var ikke alvorlig
              sygdom og ikke død.
            </p>
            <p>
              I den gruppe var der <strong>8 tilfælde blandt 18.198 vaccinerede</strong> og{" "}
              <strong>162 tilfælde blandt 18.325, der fik placebo</strong>. Artiklen angiver vaccineeffekten til{" "}
              <strong>95,0 %</strong> med et 95 % kredibilitetsinterval fra 90,3 til 97,6. Sikkerheden er beskrevet over
              en median på 2 måneder. Forsøget er{" "}
              <a href={POLACK} rel="noopener noreferrer">
                Polack et al., N Engl J Med 2020
              </a>
              .
            </p>
            <p>
              Regner man på andelene af deltagere, er den relative reduktion {rrr} %, den absolutte forskel {arr}{" "}
              procentpoint, og NNT {Math.round(measures.nnt!)}. Det svarer til omkring{" "}
              {perThousandVaccine.toLocaleString("da-DK", { maximumFractionDigits: 1 })} tilfælde pr. 1.000 vaccinerede
              og {perThousandPlacebo.toLocaleString("da-DK", { maximumFractionDigits: 1 })} pr. 1.000 i placebogruppen.
              Artiklens 95,0 % er regnet på tilfælde pr. observationstid med en bayesiansk model. De to måder lander på
              samme afrundede relative tal.
            </p>
            <p>
              NNT på 119 betyder ikke, at 119 mennesker skal vaccineres for at én undgår død. Det betyder, at der i
              dette forsøgs opfølgning i gennemsnit skulle 119 vaccineres, for at én undgik symptomgivende covid-19.
              Havde smitten i de uger været højere, ville den absolutte forskel være større og NNT lavere, også ved
              samme relative effekt. Havde smitten været lavere, det modsatte.
            </p>
            <div className="icon-grids">
              <IconArray
                filled={Math.round(perThousandPlacebo)}
                tone="placebo"
                caption={`Placebo: ${Math.round(perThousandPlacebo)} af 1.000, afrundet fra ${perThousandPlacebo.toLocaleString("da-DK", { maximumFractionDigits: 1 })}.`}
              />
              <IconArray
                filled={0}
                tone="vaccine"
                caption={`Vaccinerede: ${perThousandVaccine.toLocaleString("da-DK", { maximumFractionDigits: 1 })} af 1.000. Det er under én person, så ingen prik er farvet.`}
              />
            </div>
            <p className="small muted">
              Hver prik er én person ud af 1.000. Farven er et tilfælde af det primære udfald. Artiklen rapporterede
              også 10 alvorlige forløb med start efter første dosis, 9 i placebogruppen og 1 hos en vaccineret. Det er
              et andet udfald og en anden tælling end de 8 og 162.
            </p>
            <p>
              Olliaro, Torreele og Vaillant gennemgik i Lancet Microbe i 2021, hvordan de offentliggjorte relative
              effekter så ud ved siden af de absolutte. For Pfizer–BioNTech angav de en absolut reduktion på 0,84 % og,
              efter tidsskriftets rettelse, et NNV på 119. NNV er her det samme som NNT.{" "}
              <a href={OLLIARO} rel="noopener noreferrer">
                Kommentar i Lancet Microbe
              </a>
              .{" "}
              <a href={OLLIARO_CORRECTION} rel="noopener noreferrer">
                Rettelsen
              </a>{" "}
              ændrede NNV for Pfizer–BioNTech til 119.
            </p>
            <p>
              Senere studier af vaccinen, efter den var taget i brug, har set på andre udfald, blandt andet alvorlig
              sygdom. De tal er ikke dette forsøgs primære udfald og står ikke her.
            </p>
          </article>

          <article className="card">
            <h2>Regn selv</h2>
            <p>Skriv to risici i procent. Lommeregneren bruger kun de tal, du taster, ikke artiklens model.</p>
            <EffectCalculator />
          </article>

          <article className="card">
            <h2>Hvad det har med indberetningerne at gøre</h2>
            <p>
              Siderne om de enkelte stoffer tæller formodede bivirkninger, som nogen har indberettet til
              Lægemiddelstyrelsen. En indberetning er ikke en hyppighed. Nævneren, alle der har fået stoffet uden at
              melde noget, kendes ikke, og ikke alle formodede bivirkninger bliver meldt. Derfor kan man ikke læse et
              NNH ud af indberetningerne.
            </p>
            <p>
              NNT og NNH fra et forsøg har en nævner, men kun for det udfald og den tid, protokollen målte. De er ikke
              en livstidsrisiko, og de er ikke det samme som antallet af indberetninger på{" "}
              <Link href="/stof/covid-19-vaccines/">covid-19-vaccinerne</Link> eller på et andet stof.
            </p>
          </article>

          <article className="card">
            <h2>TheNNT</h2>
            <p>
              <a href="https://www.thennt.com/" rel="noopener noreferrer">
                TheNNT
              </a>{" "}
              er et uafhængigt amerikansk opslagsværk, der genfortæller forsøg i samme format: hvad behandlingen blev
              sammenlignet med, hvilket udfald der blev talt, hvor lang tid der gik, og så NNT for gavn og NNH for
              skade. Farven markerer, om de vurderer gavnen som tydelig, usikker eller fraværende. Et opslag uden
              tidsrum og uden udfald er ikke færdigt. Sitet her kopierer ikke deres vurderinger.
            </p>
          </article>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
