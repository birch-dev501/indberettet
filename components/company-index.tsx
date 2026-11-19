"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { filterCompanies, type CompanyFilterRow } from "@/lib/company-filter";
import { formatInt } from "@/lib/format";
import { usePinScroll } from "@/components/pin-scroll";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZÆØÅ".split("");

export function CompanyIndex({ companies }: { companies: CompanyFilterRow[] }) {
  const [query, setQuery] = useState("");
  const [applied, setApplied] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  usePinScroll(inputRef);

  useEffect(() => {
    const timer = window.setTimeout(() => setApplied(query), 120);
    return () => window.clearTimeout(timer);
  }, [query]);

  const filtering = applied.trim().length > 0;
  const matches = useMemo(() => (filtering ? filterCompanies(applied, companies) : companies), [applied, companies, filtering]);
  const groups = useMemo(() => {
    if (filtering) return [];
    return LETTERS.map((letter) => ({
      letter,
      rows: companies.filter((company) => company.label.toLocaleUpperCase("da").startsWith(letter)),
    })).filter((group) => group.rows.length > 0);
  }, [companies, filtering]);

  return (
    <div className="index-filter">
      <div className="sticky-search">
        <label className="kicker" htmlFor="firmasogning">
          Søg
        </label>
        <input
          ref={inputRef}
          id="firmasogning"
          role="searchbox"
          value={query}
          placeholder="Søg på firma, fx Novo, MSD eller Merck"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          onChange={(event) => setQuery(event.target.value)}
        />
        {filtering && (
          <p className="small muted" aria-live="polite">
            {matches.length === 0
              ? `Ingen firmaer matcher «${applied.trim()}».`
              : `${formatInt(matches.length)} ${matches.length === 1 ? "firma" : "firmaer"}`}
          </p>
        )}
      </div>
      <nav className="alpha" aria-label="Bogstaver">
        {LETTERS.map((letter) =>
          filtering ? (
            <span key={letter}>{letter}</span>
          ) : (
            <a key={letter} href={`#firma-${letter}`}>
              {letter}
            </a>
          ),
        )}
      </nav>
      {filtering ? (
        <div className="substance-index">
          {matches.map((company) => (
            <CompanyLink key={company.slug} company={company} />
          ))}
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.letter} id={`firma-${group.letter}`}>
            <h2>{group.letter}</h2>
            <div className="substance-index">
              {group.rows.map((company) => (
                <CompanyLink key={company.slug} company={company} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function CompanyLink({ company }: { company: CompanyFilterRow }) {
  return (
    <Link href={`/firma/${company.slug}`}>
      {company.label}{" "}
      <small>
        {formatInt(company.substanceCount)} stoffer · {formatInt(company.productRows)} præparatrækker
      </small>
    </Link>
  );
}
