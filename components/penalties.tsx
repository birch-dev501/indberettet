"use client";

import Link from "next/link";
import { useState } from "react";
import { caseMatches, caseNoteFor, type CaseNote } from "@/lib/case-notes";
import { formatUsd, VIOLATION_NOTE, type PenaltyCase, type ViolationRecord } from "@/lib/violations";

export function Penalties({ record }: { record: ViolationRecord }) {
  const [query, setQuery] = useState("");
  const pool = uniqueCases([...(record.largest ?? []), ...(record.recent ?? [])]);
  const searching = query.trim().length > 0;
  const largest = record.largest.filter((item) => !item.duplicate).slice(0, 6);
  const recent = (record.recent ?? [])
    .filter((item) => !item.duplicate)
    .filter((item) => !largest.some((kept) => kept.url === item.url))
    .slice(0, 4);
  const matches = searching ? pool.filter((item) => caseMatchesRow(item, query)) : [];

  return (
    <section className="section card" id="boeder">
      <h2>Overtrædelser og bøder</h2>
      <p className="muted">
        Moderselskabet i Violation Tracker er {record.parentName}. Totalen er deres egen, justeret så samme sag ikke
        tælles to gange. Hvor et lægemiddel er knyttet til sagen, står det under beløbet med kilde.
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
      <label className="case-search">
        Søg i sagerne
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Lægemiddel, fx Vioxx"
          aria-label="Søg i sagerne på lægemiddel"
        />
      </label>
      {searching ? (
        <>
          <h3>Sager der matcher</h3>
          {matches.length === 0 ? <p>Ingen af de viste sager matcher.</p> : <CaseTable rows={matches} />}
        </>
      ) : (
        <>
          <h3>Største sager</h3>
          <CaseTable rows={largest} />
          {recent.length > 0 && (
            <>
              <h3>Seneste sager</h3>
              <CaseTable rows={recent} />
            </>
          )}
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
        . Lægemiddelnavnene er tilføjet fra de kilder, der står på den enkelte sag.
      </p>
    </section>
  );
}

function uniqueCases(rows: PenaltyCase[]): PenaltyCase[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (row.duplicate || seen.has(row.url)) return false;
    seen.add(row.url);
    return true;
  });
}

function caseMatchesRow(row: PenaltyCase, query: string): boolean {
  const note = caseNoteFor(row.url);
  return caseMatches(
    [
      row.company,
      row.offense,
      String(row.year),
      note?.summary ?? "",
      ...(note?.search ?? []),
      ...(note?.drugs.flatMap((drug) => [drug.name, drug.generic]) ?? []),
    ],
    query,
  );
}

function CaseTable({ rows }: { rows: PenaltyCase[] }) {
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
                <CaseLine note={caseNoteFor(row.url)} />
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

function CaseLine({ note }: { note: CaseNote | null }) {
  if (!note) return null;
  return (
    <p className="case-note">
      {note.drugs.map((drug, index) => (
        <span key={`${drug.name}-${drug.generic}`}>
          {index > 0 ? (index === note.drugs.length - 1 ? " og " : ", ") : null}
          {drug.slug ? <Link href={`/stof/${drug.slug}/`}>{drug.name}</Link> : drug.name} ({drug.generic})
        </span>
      ))}
      {": "}
      {note.summary}{" "}
      <a href={note.sourceUrl} rel="noopener noreferrer">
        {note.sourceName}
      </a>
    </p>
  );
}
