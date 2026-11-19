import { formatUsd, VIOLATION_NOTE, type ViolationRecord } from "@/lib/violations";

export function Penalties({ record }: { record: ViolationRecord }) {
  const largest = record.largest.filter((item) => !item.duplicate).slice(0, 6);
  const recent = (record.recent ?? [])
    .filter((item) => !item.duplicate)
    .filter((item) => !largest.some((kept) => kept.url === item.url))
    .slice(0, 4);

  return (
    <section className="section card" id="boeder">
      <h2>Overtrædelser og bøder</h2>
      <p className="muted">
        Moderselskabet i Violation Tracker er {record.parentName}. Totalen er deres egen, justeret så samme sag ikke
        tælles to gange.
      </p>
      <div className="stat-grid">
        <article className="stat">
          <strong>{formatUsd(record.penaltyTotalUsd)}</strong>
          <span>Bøder siden 2000</span>
        </article>
        <article className="stat">
          <strong>{record.recordCount.toLocaleString("da-DK")}</strong>
          <span>Sager i registret</span>
        </article>
      </div>
      <h3>Hyppigste sagstyper</h3>
      <ul>
        {record.topOffenseTypes.slice(0, 5).map((offense) => (
          <li key={offense.type}>
            {offense.type}: {formatUsd(offense.totalUsd)} ({offense.count.toLocaleString("da-DK")} sager)
          </li>
        ))}
      </ul>
      <h3>Største sager</h3>
      <CaseTable rows={largest} />
      {recent.length > 0 && (
        <>
          <h3>Seneste sager</h3>
          <CaseTable rows={recent} />
        </>
      )}
      <p className="warning-note">{VIOLATION_NOTE}</p>
      <p className="small muted">
        Kilde:{" "}
        <a href={record.parentUrl} rel="noopener noreferrer">
          {record.parentName} hos Violation Tracker
        </a>
        , udgivet af{" "}
        <a href="https://violationtracker.goodjobsfirst.org/industry/pharmaceuticals" rel="noopener noreferrer">
          Good Jobs First
        </a>
        .
      </p>
    </section>
  );
}

function CaseTable({ rows }: { rows: ViolationRecord["largest"] }) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>År</th>
            <th>Sag</th>
            <th>Myndighed</th>
            <th className="num">Beløb</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.url}>
              <td>{row.year}</td>
              <td>
                <a href={row.url} rel="noopener noreferrer">
                  {row.company}
                </a>
                <p className="identity">{row.offense}</p>
              </td>
              <td>{row.agency}</td>
              <td className="num">{formatUsd(row.amountUsd)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
