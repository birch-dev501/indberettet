import type { Metadata } from "next";
import Link from "next/link";
import { EffectCalculator } from "@/components/effect-calculator";
import { HarmBalance } from "@/components/harm-balance";
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
const KARLSTAD = "https://jamanetwork.com/journals/jamacardiology/fullarticle/2791253";
const CDC_MMWR = "https://www.cdc.gov/mmwr/volumes/70/wr/mm7027e2.htm";
const HUSBY = "https://www.bmj.com/content/375/bmj-2021-068665";
const CDC_OBESITY = "https://www.cdc.gov/nchs/products/databriefs/db508.htm";
const DK_OBESITY = "https://www.sst.dk/media/wrginiwh/christine-bjoerk-petersen_oplaeg-session1.pdf";

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

          <article className="card" id="nnh">
            <h2>Gavn og skade ved siden af hinanden</h2>
            <p>
              NNT siger, hvor mange der skal behandles, for at én undgår udfaldet. NNH siger, hvor mange der skal
              behandles, for at én får en bestemt skade. Formlen for gavnen er NNT = 1 / (udgangsrisiko × effekt).
              Effekten er den relative reduktion som en andel: 95 % er 0,95. NNH for én reaktion er 1 divideret med
              risikoen for netop den reaktion.
            </p>
            <p>
              <strong>Eksempeltal, ikke en måling.</strong> Hvis 1 ud af 10.000 bliver indlagt med covid-19 uden
              vaccinen, og vaccinen forebygger dem alle, er NNT 10.000. Hvis en alvorlig reaktion rammer 1 ud af 5.000,
              er NNH 5.000. Pr. 100.000 vaccinerede er det 10 forebyggede indlæggelser og 20 reaktioner, altså omkring
              to reaktioner for hver indlæggelse, eksemplet forebygger. Er effekten under 100 %, stiger NNT.
            </p>
            <p>
              Der findes mange slags reaktioner, og de har ikke samme alvor. En mild lokal reaktion og en indlæggelse
              kan ikke lægges sammen til ét NNH. Gavnen kan også være andet end indlæggelse: smitte, intensivforløb
              eller død. Hvert udfald har sit eget tal.
            </p>
            <h3>Målte tal, to forskellige kilder</h3>
            <p>
              I et nordisk register var den overskydende risiko for myokarditis højest hos unge mænd i de første 28
              dage efter andet stik.{" "}
              <a href={KARLSTAD} rel="noopener noreferrer">
                Karlstad et al., JAMA Cardiology 2022
              </a>{" "}
              fandt 5,55 ekstra tilfælde pr. 100.000 (interval 3,70–7,39) efter andet stik med BNT162b2 og 18,39 pr.
              100.000 (9,05–27,72) efter andet stik med mRNA-1273, hos mænd på 16–24 år. Efter første stik med BNT162b2
              var tallet 1,55 pr. 100.000 (0,70–2,39) i samme gruppe. Hos mænd på 40 år og derover var ekstra tilfælde
              efter to doser BNT162b2 0,22 pr. 100.000, og intervallet gik gennem nul. Hos kvinder på 16–24 år var der
              for få myokarditis-tilfælde efter to doser BNT162b2 til at regne et stabilt overskud. Opfølgningen løb fra
              27. december 2020 til 5. oktober 2021.
            </p>
            <p className="warning-note">
              CDC-modellen er amerikansk og kan ikke overføres direkte til Danmark. I august 2021 til august 2023 havde
              40,3 % af de amerikanske voksne svær overvægt, målt som BMI på 30 eller derover (
              <a href={CDC_OBESITY} rel="noopener noreferrer">
                CDC, NCHS Data Brief 508
              </a>
              ). I Den Nationale Sundhedsprofil 2021 var andelen i Danmark 18,5 %, ud fra selvrapporteret højde og vægt
              (
              <a href={DK_OBESITY} rel="noopener noreferrer">
                Sundhedsstyrelsen
              </a>
              ). Metoderne er ikke ens, men forskellen er stor. Svær overvægt og anden sygdom er blandt de største
              grunde til, at covid-19 bliver alvorlig. Inden for samme alder er risikoen højere hos personer med de
              sygdomme end hos raske. CDC’s tal er et gennemsnit for en mere overvægtig befolkning i en bestemt
              smitteperiode i 2021, og de overvurderer sandsynligvis gavnen for danskere, især for raske unge.
            </p>
            <p>
              Den artikel tæller ikke forebyggede covid-19-indlæggelser. Et andet regnestykke, fra det amerikanske
              smitteagentur CDC i juli 2021, antog 95 % effekt af to mRNA-doser og så 120 dage frem. Pr. million doser
              ventede modellen hos mænd på 18–24 år 530 forebyggede indlæggelser og 45–56 tilfælde af myokarditis. Hos
              mænd på 30 år og derover var det 4.598 forebyggede indlæggelser og 3–4 tilfælde af myokarditis. Hos piger
              og kvinder var de forventede myokarditis-tal lavere end hos mænd i samme alder, mens de forebyggede
              indlæggelser steg med alderen. Tabellen har også forebyggede smittetilfælde, intensivforløb og dødsfald.{" "}
              <a href={CDC_MMWR} rel="noopener noreferrer">
                Gargano et al., MMWR 2021
              </a>
              . Lommeregnerens to amerikanske forvalg bruger den model og er mærket som det.
            </p>
            <h3>Danske tal, ikke et samlet NNT</h3>
            <p>
              Et dansk NNT kan ikke regnes rent her. Der mangler en indlæggelsesrisiko for samme gruppe, samme periode
              og samme helbred, som kan sættes ind i formlen. Komponenterne står hver for sig.
            </p>
            <p>
              <a href={HUSBY} rel="noopener noreferrer">
                Husby et al., BMJ 2021
              </a>{" "}
              fulgte 4.931.775 personer i Danmark på 12 år og derover fra 1. oktober 2020 til 5. oktober 2021.
              Myokarditis eller myoperikarditis inden for 28 dage efter vaccination med BNT162b2 havde en absolut rate
              på 1,4 pr. 100.000 (1,0–1,8). Den justerede hazard ratio mod tiden før vaccination var 1,34 (0,90–2,00),
              så den samlede forskel er usikker. Blandt 12–39-årige var raten 1,6 pr. 100.000 (1,0–2,6) og hazard
              ratio 1,48 (0,74–2,98). Efter mRNA-1273 var raten 4,2 pr. 100.000 (2,6–6,4) og hazard ratio 3,92
              (2,30–6,68); blandt 12–39-årige 5,7 pr. 100.000 (3,3–9,3) og hazard ratio 5,24 (2,47–11,12). Raterne er
              antal blandt vaccinerede, ikke et overskud i forhold til uvaccinerede, og de er ikke delt i raske og
              personer med anden sygdom. Derfor bliver de ikke til et NNH i lommeregneren.
            </p>
            <p>
              Det nordiske overskud ovenfor, fra Karlstad, omfatter også Danmark, men stadig ikke en dansk
              indlæggelsesnævner. Statens Serum Institut offentliggør løbende overvågning af covid-19. Denne side har
              ikke et tal for, hvor ofte uvaccinerede raske unge blev indlagt i netop det vindue, så det indgår ikke.
            </p>
            <p>
              De to kilder er ikke samme befolkning, samme land eller samme tidsrum. Det nordiske tal er ekstra
              hospitalsdiagnoser i 28 dage. CDC-tallet er en model over 120 dage med en antaget effekt. Balancen flytter
              sig med alder, køn, hvilket stik, hvilket mRNA-præparat, hvor meget smitte der er, og om personen har
              været smittet før. Encefalitis er meget sjælden, og en sikker sammenhæng med disse vacciner er ikke
              etableret, så den får ikke et tal her. Den kan kun bruges som et hypotetisk eksempel, hvis man selv
              skriver en risiko ind.
            </p>
            <HarmBalance />
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
