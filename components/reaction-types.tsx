"use client";

import { useMemo, useState } from "react";
import { formatInt, formatPercent } from "@/lib/format";
import { plainSoc } from "@/lib/soc-plain";
import { linkTag, resolveTerm } from "@/lib/term-links";
import type { Substance, TermRow } from "@/lib/types";

type ClassRow = {
  abbrev: string;
  label: string;
  plain: string;
  nonserious: number;
  serious: number;
  fatal: number;
  total: number;
};

function countByAbbrev(rows: { abbrev: string; reactions: number }[]): Map<string, number> {
  return new Map(rows.map((row) => [row.abbrev, row.reactions]));
}

export function ReactionTypes({ substance }: { substance: Substance }) {
  const [open, setOpen] = useState<string | null>(null);
  const all = substance.views.all;
  const rows = useMemo(() => {
    const nonserious = countByAbbrev(substance.views.N.soc);
    const serious = countByAbbrev(substance.views.S.soc);
    const fatal = countByAbbrev(substance.views.F.soc);
    return all.soc
      .map((row) => {
        const parts = {
          nonserious: nonserious.get(row.abbrev) ?? 0,
          serious: serious.get(row.abbrev) ?? 0,
          fatal: fatal.get(row.abbrev) ?? 0,
        };
        return {
          abbrev: row.abbrev,
          label: row.label,
          plain: plainSoc(row.abbrev, row.label),
          ...parts,
          total: parts.nonserious + parts.serious + parts.fatal,
        } satisfies ClassRow;
      })
      .filter((row) => row.total > 0)
      .sort((a, b) => b.total - a.total || a.plain.localeCompare(b.plain, "da"));
  }, [all.soc, substance.views.F.soc, substance.views.N.soc, substance.views.S.soc]);
  const terms = useMemo(() => {
    const grouped = new Map<string, TermRow[]>();
    for (const term of all.terms) {
      const list = grouped.get(term.soc) ?? [];
      list.push(term);
      grouped.set(term.soc, list);
    }
    for (const list of grouped.values()) list.sort((a, b) => b.reactions - a.reactions);
    return grouped;
  }, [all.terms]);
  const max = Math.max(1, ...rows.map((row) => row.total));
  if (rows.length === 0) return null;

  return (
    <section className="card section" id="reaktionstyper" aria-labelledby="reaktionstyper-titel">
      <h2 id="reaktionstyper-titel">Typer af reaktioner</h2>
      <p className="muted">
        Organklasserne er MedDRAs. En indberetning kan indeholde flere reaktioner, så summen er større end de{" "}
        {formatInt(all.reports)} indberetninger. Procenterne er andele af de {formatInt(all.reactions)} reaktioner.
      </p>
      <p className="legend">
        <span>
          <i className="swatch ns" /> Ikke-alvorlig
        </span>
        <span>
          <i className="swatch serious" /> Alvorlig
        </span>
        <span>
          <i className="swatch fatal" /> Dødsfald
        </span>
      </p>
      <div className="soc-chart">
        {rows.map((row) => {
          const expanded = open === row.abbrev;
          const width = (row.total / max) * 100;
          const top = (terms.get(row.abbrev) ?? []).slice(0, 8);
          return (
            <div className={expanded ? "soc-item open" : "soc-item"} key={row.abbrev}>
              <button
                type="button"
                className="soc-row"
                aria-expanded={expanded}
                aria-controls={`soc-${row.abbrev}`}
                onClick={() => setOpen(expanded ? null : row.abbrev)}
              >
                <span className="soc-name">
                  {row.plain}
                  <span className="sr-only">. {row.label}</span>
                </span>
                <span className="soc-track" aria-hidden="true">
                  <span className="soc-bar" style={{ width: `${width}%` }}>
                    <span style={{ flex: row.nonserious }} />
                    <span className="serious" style={{ flex: row.serious }} />
                    <span className="fatal" style={{ flex: row.fatal }} />
                  </span>
                </span>
                <span className="soc-count">
                  {formatInt(row.total)}
                  <span className="muted"> · {formatPercent(row.total, all.reactions)}</span>
                </span>
              </button>
              {expanded && (
                <div className="soc-detail" id={`soc-${row.abbrev}`}>
                  <p className="small muted">
                    {formatInt(row.nonserious)} ikke-alvorlige, {formatInt(row.serious)} alvorlige,{" "}
                    {formatInt(row.fatal)} ved dødsfald. De hyppigste termer i klassen:
                  </p>
                  {top.length === 0 ? (
                    <p>Ingen foretrukne termer i klassen.</p>
                  ) : (
                    <ul className="soc-terms">
                      {top.map((term) => {
                        const link = resolveTerm(term.pt);
                        const name = link.danish ?? term.pt;
                        return (
                          <li key={term.pt}>
                            {link.href ? (
                              <a href={link.href} target="_blank" rel="noopener noreferrer">
                                {name}
                                {linkTag(link) ? <span className="tag quiet">{linkTag(link)}</span> : null}
                              </a>
                            ) : (
                              name
                            )}
                            {link.danish ? <span className="term-en"> {term.pt}</span> : null}
                            <span className="soc-count">
                              {formatInt(term.reactions)}
                              {term.fatalReactions > 0 ? <span className="muted"> · {formatInt(term.fatalReactions)} fatale</span> : null}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
