import Link from "next/link";
import type { EffectView } from "@/lib/effect-records";
import { formatDate } from "@/lib/format";

export function EffectCard({ effect }: { effect: EffectView }) {
  const { record } = effect;
  const others = record.notCovered.join(" og ");
  return (
    <article className="card section" id="effekt">
      <p className="kicker">Udenlandsk forsøg. Ikke danske indberetninger.</p>
      <h2>Effekt i godkendelsesforsøget</h2>
      <p>
        Tallene gælder {record.product} ({record.code}, {record.makers}) i forsøg {record.trial}. De gælder ikke {others}.
        De gælder ikke indberetningerne på denne side.
      </p>
      <p>{record.endpoint}</p>
      <p>
        {record.population} Data er opgjort til {formatDate(record.dataCutoff)}.
      </p>
      <p>
        {effect.treatedEvents} af {effect.treatedN} vaccinerede fik udfaldet. {effect.controlEvents} af {effect.controlN} i
        placebogruppen fik det. ARR og NNT er regnet på de andele, ikke på personår.
      </p>
      <p>
        Relativ risikoreduktion er den del af placebogruppens tilfælde, der udeblev. Her er den {effect.rrr} %. Den
        offentliggjorte vaccineeffekt er {effect.published} %. Polack og kolleger angiver et 95 % kredibilitetsinterval
        på {effect.polackLow} til {effect.polackHigh}. EMA-produktinformationen, {record.publishedEffect.emaCi.table},
        angiver et 95 % konfidensinterval på {effect.emaLow} til {effect.emaHigh} efter{" "}
        {record.publishedEffect.emaCi.method}.
      </p>
      <p>
        Absolut risikoreduktion er forskellen mellem de to andele, i procentpoint. Her er den {effect.arr} procentpoint.
      </p>
      <p>
        NNT er 1 divideret med forskellen som andel, cirka {effect.arrShare}. Det er det samme som 100 divideret med{" "}
        {effect.arr} procentpoint, ikke 1 divideret med {effect.arr}. Tallet afrundes til nærmeste hele tal.{" "}
        {effect.nntRaw} bliver {effect.nnt}. I dette forsøgs opfølgning skulle der i gennemsnit vaccineres {effect.nnt}{" "}
        personer for at forebygge ét tilfælde af symptomgivende covid-19. Det er ikke NNT for alvorlig sygdom,
        indlæggelse eller død. Kilderne angiver ikke et interval for NNT eller for den absolutte forskel.
      </p>
      <p>
        NNT hører til netop dette udfald, denne population, udgangsrisikoen i de uger og den opfølgning, tallene er talt
        over.
      </p>
      <p>{record.followUp} NNT gælder den periode. Det gælder ikke et år og ikke et senere smitteår.</p>
      <ul>
        {record.caveats.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p>
        Indberetningerne herunder er mistanker. De er ikke en hyppighed og ikke en bevist årsag. De kan ikke sættes
        direkte over for NNT.
      </p>
      <p>
        <Link href="/forstaa-forskning/#bnt162b2">Læs hvordan de 95 % bliver til en absolut forskel</Link>.
      </p>
      <p className="small muted">Kilder, opslag {formatDate(record.retrieved)}.</p>
      <ul>
        {record.sources.map((source) => (
          <li key={source.url}>
            <a href={source.url} rel="noopener noreferrer">
              {source.name}
            </a>
          </li>
        ))}
      </ul>
    </article>
  );
}
