import type { Metadata } from "next";
import Link from "next/link";
import { TestCalculator } from "@/components/test-calculator";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { COCHRANE_ANTIGEN, HIGH_PREVALENCE, LOW_PREVALENCE, type BayesCounts } from "@/lib/bayes";

export const metadata: Metadata = {
  title: "Sådan læses en test",
  description:
    "Sand og falsk positiv, sensitivitet, specificitet og prædiktiv værdi. Coronatest per 10.000, med tal fra Cochrane 2022.",
};

function percent(value: number | null): string {
  if (value === null) return "kan ikke regnes";
  return `${(value * 100).toLocaleString("da-DK", { maximumFractionDigits: 1, minimumFractionDigits: 1 })} %`;
}

function count(value: number): string {
  return value.toLocaleString("da-DK");
}

function Table({ row }: { row: BayesCounts }) {
  return (
    <div className="table-scroll">
      <table>
        <caption>Per {count(row.tested)} testede</caption>
        <thead>
          <tr>
            <th />
            <th className="num">Har infektionen</th>
            <th className="num">Har den ikke</th>
            <th className="num">I alt</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>Positiv test</th>
            <td className="num">{count(row.truePositive)}</td>
            <td className="num">{count(row.falsePositive)}</td>
            <td className="num">{count(row.truePositive + row.falsePositive)}</td>
          </tr>
          <tr>
            <th>Negativ test</th>
            <td className="num">{count(row.falseNegative)}</td>
            <td className="num">{count(row.trueNegative)}</td>
            <td className="num">{count(row.falseNegative + row.trueNegative)}</td>
          </tr>
          <tr>
            <th>I alt</th>
            <td className="num">{count(row.sick)}</td>
            <td className="num">{count(row.well)}</td>
            <td className="num">{count(row.tested)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function TestLiteracyPage() {
  return (
    <>
      <SiteHeader current="forskning" />
      <main id="indhold" className="wrap page-head">
        <p className="kicker">Forsøgstal</p>
        <h1>Sådan læses en test.</h1>
        <p className="lede">
          En test med høj specificitet kan stadig give mange falske positive, når det man leder efter er sjældent.
          Regnestykket er Bayes. Siden hænger sammen med{" "}
          <Link href="/forstaa-usikkerhed/">sådan læses usikkerhed</Link>.
        </p>

        <section className="section stack">
          <article className="card" id="tabel">
            <h2>Fire udfald</h2>
            <p>En test og en sand tilstand giver fire tal.</p>
            <p>Sand positiv. Personen har infektionen, og testen er positiv.</p>
            <p>Falsk positiv. Personen har ikke infektionen, og testen er positiv.</p>
            <p>Sand negativ. Personen har ikke infektionen, og testen er negativ.</p>
            <p>Falsk negativ. Personen har infektionen, og testen er negativ.</p>
          </article>

          <article className="card" id="maal">
            <h2>Sensitivitet og specificitet</h2>
            <p>
              Sensitivitet er andelen af de syge, som testen finder. Den siger ikke, hvor mange af de positive svar
              der er rigtige.
            </p>
            <p>
              Specificitet er andelen af de raske, som testen frikender. Den siger heller ikke, hvor mange af de
              positive svar der er rigtige.
            </p>
            <p>
              Positiv prædiktiv værdi er andelen af de positive svar, der er sande. Negativ prædiktiv værdi er andelen
              af de negative svar, der er sande. Begge afhænger af, hvor mange der faktisk er syge.
            </p>
          </article>

          <article className="card" id="bayes">
            <h2>Bayes i ord</h2>
            <p>
              Start med, hvor mange af 10.000 der er syge. Det er forekomsten. Gang med
              sensitiviteten. Det er de sandt positive. De øvrige syge er falsk negative.
            </p>
            <p>
              De resterende er raske. Gang med specificiteten. Det er de sandt negative. De øvrige raske er falsk
              positive.
            </p>
            <p>
              Positiv prædiktiv værdi er sandt positive delt med alle positive. Negativ prædiktiv værdi er sandt
              negative delt med alle negative.
            </p>
          </article>

          <article className="card" id="lav">
            <h2>Lav forekomst, eksempel</h2>
            <p>
              Forekomsten 0,1 % er et eksempel, ikke en målt dansk forekomst. Testtallene er offentliggjorte.{" "}
              <a href={COCHRANE_ANTIGEN.sourceUrl} rel="noopener noreferrer">
                {COCHRANE_ANTIGEN.sourceName}
              </a>{" "}
              fandt for antigentest uden symptomer en gennemsnitlig sensitivitet på 54,7 % og en specificitet på 99,7 %.
            </p>
            <Table row={LOW_PREVALENCE} />
            <p>
              Af {count(LOW_PREVALENCE.truePositive + LOW_PREVALENCE.falsePositive)} positive svar er{" "}
              {count(LOW_PREVALENCE.falsePositive)} falske. Den positive prædiktive værdi er {percent(LOW_PREVALENCE.ppv)}.
              Den negative prædiktive værdi er {percent(LOW_PREVALENCE.npv)}.
            </p>
            <p>
              Specificiteten er 99,7 %. Alligevel er de fleste positive svar falske, fordi 9.990 af 10.000 er raske.
            </p>
          </article>

          <article className="card" id="hoj">
            <h2>Høj forekomst, eksempel</h2>
            <p>
              Forekomsten 20 % er et eksempel blandt mennesker med symptomer, ikke en målt dansk andel. Samme
              Cochrane-oversigt fandt med symptomer en sensitivitet på 73,0 % og en specificitet på 99,1 %.
            </p>
            <Table row={HIGH_PREVALENCE} />
            <p>
              Af {count(HIGH_PREVALENCE.truePositive + HIGH_PREVALENCE.falsePositive)} positive svar er{" "}
              {count(HIGH_PREVALENCE.falsePositive)} falske. Den positive prædiktive værdi er {percent(HIGH_PREVALENCE.ppv)}.
              Den negative prædiktive værdi er {percent(HIGH_PREVALENCE.npv)}.
            </p>
            <p>
              Samme slags test giver en høj positiv prædiktiv værdi, når mange af de testede er syge. {count(HIGH_PREVALENCE.falseNegative)} syge
              får stadig et negativt svar.
            </p>
          </article>

          <article className="card" id="beregner">
            <h2>Regn selv</h2>
            <p>Tallene herunder er dine. De hentes ikke udefra. Udgangspunktet er eksemplet uden symptomer.</p>
            <TestCalculator />
          </article>

          <article className="card" id="indberetning">
            <h2>Hvad det har med en indberetning at gøre</h2>
            <p>
              En indberetning er en mistanke, ikke et bevis for, at medicinen er årsagen. Når bivirkningen også sker
              uden medicinen, ligner det en lav forekomst. Ét positivt signal er da ofte et tilfælde.
            </p>
            <p>
              <Link href="/forstaa-usikkerhed/">Tilbage til interval og p-værdi</Link>.
            </p>
          </article>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
