import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { BNT162B2, trialRisks } from "@/lib/effects";

const POLACK = "https://www.nejm.org/doi/full/10.1056/NEJMoa2034577";
const KARLSTAD = "https://jamanetwork.com/journals/jamacardiology/fullarticle/2791253";
const HUSBY = "https://www.bmj.com/content/375/bmj-2021-068665";

export const metadata: Metadata = {
  title: "Sådan læses usikkerhed",
  description:
    "Konfidensinterval, p-værdi og signifikans, regnet på tallene fra BNT162b2, Karlstad og Husby.",
};

export default function UncertaintyPage() {
  const { treated, control, measures } = trialRisks();
  const rrr = (measures.rrr! * 100).toLocaleString("da-DK", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  const arr = (measures.arr * 100).toLocaleString("da-DK", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  const placebo = (control * 100).toLocaleString("da-DK", { maximumFractionDigits: 3, minimumFractionDigits: 3 });
  const vaccine = (treated * 100).toLocaleString("da-DK", { maximumFractionDigits: 3, minimumFractionDigits: 3 });

  return (
    <>
      <SiteHeader current="usikkerhed" />
      <main id="indhold" className="wrap page-head">
        <p className="kicker">Forsøgstal</p>
        <h1>Sådan læses usikkerhed.</h1>
        <p className="lede">
          Et studie giver et skøn, ikke den endelige sandhed. Intervallet viser, hvilke tal der stadig passer med
          studiet. Polack og kolleger er et udenlandsk forsøg. Karlstad og kolleger er et nordisk register, som også
          omfatter Danmark. Husby og kolleger fulgte personer i Danmark. Kilderne er{" "}
          <a href={POLACK} rel="noopener noreferrer">Polack et al., New England Journal of Medicine 2020</a>,{" "}
          <a href={KARLSTAD} rel="noopener noreferrer">Karlstad et al., JAMA Cardiology 2022</a> og{" "}
          <a href={HUSBY} rel="noopener noreferrer">Husby et al., BMJ 2021</a>. Samme tal står på siden om{" "}
          <Link href="/forstaa-forskning/">forsøgstal</Link>.
        </p>

        <section className="section stack">
          <article className="card" id="konfidensinterval">
            <h2>Hvad et 95 % konfidensinterval er</h2>
            <p>
              Forskerne beregner intervallet ud fra studiets tal og en fast metode. Hvis man gentog det samme studie
              mange gange, ville metoden i 95 ud af 100 gentagelser ramme den sande værdi. Det enkelte interval er
              enten ramt eller ikke ramt. Det er ikke en sandsynlighed på 95 % for, at sandheden ligger i netop dette
              interval.
            </p>
            <p>
              Intervallet er heller ikke spændet for den enkelte person. Det siger ikke, at 95 % af patienterne ligger
              inden for grænserne.
            </p>
            <p>
              Polack og kolleger angav vaccineeffekten for BNT162b2 til 95,0 % med et 95 % kredibilitetsinterval fra
              90,3 til 97,6. Det er et bayesiansk interval, ikke et konfidensinterval. Det ligger helt over 0. På den
              skala er 0 ingen effekt.
            </p>
          </article>

          <article className="card" id="nul-forskel">
            <h2>0 for en forskel</h2>
            <p>
              For en forskel er nulhypotesen 0. Ingen forskel betyder, at de to grupper har samme risiko, så
              forskellen er 0.
            </p>
            <p>
              Karlstad og kolleger fandt 5,55 ekstra tilfælde af myokarditis pr. 100.000 hos mænd på 16 til 24 år efter
              andet stik med BNT162b2. Intervallet er 3,70 til 7,39. Begge grænser er over 0. Registeropgørelsen passer
              ikke med en forskel på 0.
            </p>
            <p>
              Hos mænd på 40 år og derover var det tilsvarende tal 0,22 pr. 100.000, og intervallet gik gennem 0.
              Siden om forsøgstal opgiver ikke intervallets to grænser. Opgørelsen passer med flere tilfælde, med
              ingen forskel og med færre tilfælde. Den siger ikke, hvor langt fra 0 de tal ligger.
            </p>
          </article>

          <article className="card" id="nul-forhold">
            <h2>1 for et forhold</h2>
            <p>
              Relativ risiko, odds ratio og hazard ratio er forhold. Nulhypotesen er 1. 1 betyder, at de to grupper
              har samme risiko. Et tal over 1 er en højere risiko i den gruppe, man sammenligner. Et tal under 1 er en
              lavere risiko.
            </p>
            <p>
              Husby og kolleger fandt en justeret hazard ratio på 1,34 for myokarditis eller myoperikarditis inden for
              28 dage efter BNT162b2. Intervallet er 0,90 til 2,00. 0,90 er under 1, og 2,00 er over 1. Intervallet
              indeholder 1. Opgørelsen passer med en lavere rate, med samme rate og med en fordobling.
            </p>
            <p>
              Efter mRNA-1273 var hazard ratio 3,92 med interval 2,30 til 6,68. Hele intervallet ligger over 1.
              Opgørelsen passer ikke med en ratio på 1.
            </p>
          </article>

          <article className="card" id="p-vaerdi">
            <h2>P-værdi og signifikans</h2>
            <p>
              En p-værdi er sandsynligheden for et resultat mindst så langt fra nulhypotesen, hvis nulhypotesen er
              sand. Den er ikke sandsynligheden for, at nulhypotesen er sand.
            </p>
            <p>
              Statistisk signifikant ved 5 % betyder p under 0,05. Når interval og test er regnet med samme metode,
              svarer det til, at 95 % intervallet ikke indeholder nulhypotesen. For en forskel er den grænse 0. For et
              forhold er den grænse 1.
            </p>
            <p>
              Signifikant er ikke det samme som stort. I Polack-forsøget er den relative reduktion {rrr} %. Den
              absolutte forskel er {arr} procentpoint. Den relative reduktion er stor. Den absolutte forskel er under
              ét procentpoint.
            </p>
          </article>

          <article className="card" id="relativ-absolut">
            <h2>Relativ og absolut risiko</h2>
            <p>
              I Polack-forsøget var der {BNT162B2.placeboCases} tilfælde blandt {BNT162B2.placeboN.toLocaleString("da-DK")} i
              placebogruppen og {BNT162B2.vaccinatedCases} tilfælde blandt {BNT162B2.vaccinatedN.toLocaleString("da-DK")} vaccinerede.
            </p>
            <p>
              Placeboandelen er {BNT162B2.placeboCases} delt med {BNT162B2.placeboN.toLocaleString("da-DK")}, som er{" "}
              {placebo} %. Vaccineandelen er {BNT162B2.vaccinatedCases} delt med {BNT162B2.vaccinatedN.toLocaleString("da-DK")}, som er{" "}
              {vaccine} %.
            </p>
            <p>
              Andelene ovenfor er afrundet til tre decimaler. {rrr} % og {arr} procentpoint er regnet på de uafrundede
              andele. Den relative reduktion er 1 minus vaccineandelen delt med placeboandelen. Den absolutte forskel
              er placeboandelen minus vaccineandelen.
            </p>
            <p>
              En overskrift med {rrr} % siger, hvor stor en del af placebotilfældene der udeblev. {arr} procentpoint
              siger, hvor mange procentpoint der skiller de to grupper i netop dette forsøg.
            </p>
          </article>

          <article className="card" id="ingen-effekt">
            <h2>Et interval gennem 1 er ikke et bevis for ingen effekt</h2>
            <p>
              Husby-intervallet 0,90 til 2,00 indeholder 1. Siden om forsøgstal kalder forskellen usikker. Intervallet
              er ikke mærket som 95 % her, så siden kalder det ikke statistisk signifikant. Intervallet indeholder
              også 2,00, altså en fordobling. Opgørelsen kan ikke skelne «ingen forskel» fra en reel stigning. Det
              beviser ikke, at vaccinen ikke øger risikoen.
            </p>
            <p>
              Et bredt interval betyder, at opgørelsen er usikker. Et smalt interval omkring 1 ville ligge tættere på
              ingen forskel. Det interval gør det ikke.
            </p>
            <p>
              <Link href="/forstaa-forskning/#bnt162b2">Tilbage til regnestykket for BNT162b2</Link>.{" "}
              <Link href="/forstaa-testen/">Sådan læses en test</Link>.
            </p>
          </article>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
