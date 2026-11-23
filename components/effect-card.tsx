import Link from "next/link";
import type { EffectView } from "@/lib/effect-records";
import { formatDate } from "@/lib/format";

export function EffectCard({ effect }: { effect: EffectView }) {
  const { record } = effect;
  const others = (record.notCovered ?? []).join(" og ");
  const identity = [record.code, record.makers].filter(Boolean).join(", ");
  return (
    <article className="card section" id="effekt">
      <p className="kicker">{record.kicker ?? "Udenlandsk forsøg. Ikke danske indberetninger."}</p>
      <h2>{record.heading ?? "Effekt i godkendelsesforsøget"}</h2>
      <p>
        Tallene gælder {record.product}
        {identity ? ` (${identity})` : ""} i forsøg {record.trial}.
        {others ? ` De gælder ikke ${others}.` : ""} De gælder ikke indberetningerne på denne side.
      </p>
      <p>{record.endpoint}</p>
      <p>
        {record.population}
        {record.dataCutoff ? ` Data er opgjort til ${formatDate(record.dataCutoff)}.` : ""}
      </p>
      <p>
        {effect.treatedN
          ? record.countVerb
            ? `${effect.treatedEvents} af ${effect.treatedN} ${record.treatedGroup} ${record.countVerb}. ${effect.controlEvents} af ${effect.controlN} i ${record.controlGroup} ${record.countVerb}.`
            : `${effect.treatedEvents} af ${effect.treatedN} ${record.treatedGroup} fik udfaldet. ${effect.controlEvents} af ${effect.controlN} i ${record.controlGroup} fik det.`
          : `${effect.treatedEvents} døde i ${record.treatedGroup}. ${effect.controlEvents} døde i ${record.controlGroup}.`}
        {record.calculationNote ? ` ${record.calculationNote}` : ""}
      </p>
      {effect.rrr && effect.arr && effect.nnt && effect.arrShare && effect.nntRaw ? (
        <>
          <p>
            Relativ risikoreduktion er den del af placebogruppens tilfælde, der udeblev. Her er den {effect.rrr} %.
            {effect.published && record.publishedEffect
              ? ` Den offentliggjorte ${record.publishedEffect.label} er ${effect.published}${record.publishedEffect.unit === "ratio" ? "" : " %"}.`
              : ""}
            {effect.intervals.map((interval) => (
              <span key={interval.before}>
                {" "}
                {interval.before} {interval.low} til {interval.high}
                {interval.after ? ` ${interval.after}` : ""}.
              </span>
            ))}
          </p>
          <p>
            Absolut risikoreduktion er forskellen mellem de to andele, i procentpoint. Her er den {effect.arr} procentpoint.
          </p>
          <p>
            NNT er 1 divideret med forskellen som andel, ikke med {effect.arr} procentpoint. {effect.nntRaw} er regnet med
            alle decimaler og afrundes til nærmeste hele tal, {effect.nnt}. 1 divideret med det afrundede {effect.arrShare}{" "}
            er {effect.roundedShareInverse}, og 100 divideret med {effect.arr} er {effect.roundedPointInverse}. I dette
            forsøgs opfølgning skulle der i gennemsnit {record.action}{" "}
            {effect.nnt} personer for at forebygge {record.prevented}. {record.limits} Kilderne angiver ikke et interval
            for NNT eller for den absolutte forskel.
          </p>
        </>
      ) : (
        effect.published &&
        record.publishedEffect && (
          <p>
            Den offentliggjorte {record.publishedEffect.label} er {effect.published}
            {record.publishedEffect.unit === "ratio" ? "" : " %"}.
            {effect.intervals.map((interval) => (
              <span key={interval.before}>
                {" "}
                {interval.before} {interval.low} til {interval.high}
                {interval.after ? ` ${interval.after}` : ""}.
              </span>
            ))}
          </p>
        )
      )}
      {effect.postponementDays && record.postponement && (
        <p>
          Den gennemsnitlige udskydelse af død er {record.postponement.shown ?? effect.postponementDays} dage over{" "}
          {effect.postponementYears} år.
          {effect.postponementSpread ? ` Spredningen på arealet er ${effect.postponementSpread}.` : ""} {record.postponement.method}{" "}
          <a href={record.postponement.sourceUrl} rel="noopener noreferrer">
            {record.postponement.sourceName}
          </a>
          . Tallet er ikke regnet her.
        </p>
      )}
      <p>
        {record.scopeNote ??
          "NNT hører til netop dette udfald, denne population, udgangsrisikoen i de uger og den opfølgning, tallene er talt over."}
      </p>
      {record.followUp && (
        <p>
          {record.followUp}
          {record.periodNote ? ` ${record.periodNote}` : ""}
        </p>
      )}
      <ul>
        {record.caveats.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p>
        Indberetningerne herunder er mistanker. De er ikke en hyppighed og ikke en bevist årsag. De kan ikke sættes
        direkte over for NNT.
      </p>
      {record.learnMoreHref && record.learnMoreLabel && (
        <p>
          <Link href={record.learnMoreHref}>{record.learnMoreLabel}</Link>.
        </p>
      )}
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
