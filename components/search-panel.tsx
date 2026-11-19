"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { formatInt } from "@/lib/format";
import { usePinScroll } from "@/components/pin-scroll";
import { searchCatalog, type SearchHit, type SearchIndex } from "@/lib/search";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function SearchPanel({
  placeholder = "Søg på stof, gruppe eller handelsnavn",
  autoFocus = false,
}: {
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [catalog, setCatalog] = useState<SearchIndex | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const inputId = useId();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const needle = query.trim();
  const result =
    needle.length < 2 || !catalog ? { hits: [] as SearchHit[], suggestions: [] as string[] } : searchCatalog(catalog, needle);
  usePinScroll(inputRef);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${basePath}/generated/search-index.json`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("search index missing");
        return response.json() as Promise<SearchIndex>;
      })
      .then((payload) => {
        setCatalog(payload);
        setState("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setState("error");
      });
    return () => controller.abort();
  }, []);

  return (
    <search className="search">
      <label className="kicker" htmlFor={inputId}>
        Søg
      </label>
      <input
        id={inputId}
        ref={inputRef}
        role="searchbox"
        autoFocus={autoFocus}
        value={query}
        placeholder={placeholder}
        aria-controls={listId}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        onChange={(event) => setQuery(event.target.value)}
      />
      <div id={listId}>
        {state === "loading" && <p className="muted">Henter register…</p>}
        {state === "ready" && needle.length < 2 && (
          <p className="muted small">Skriv mindst to bogstaver. Semaglutide og COVID-19 vaccines ligger klar.</p>
        )}
        {state === "error" && <p className="warning-note">Søgningen kunne ikke gennemføres. Prøv igen.</p>}
        {state === "ready" && needle.length >= 2 && result.hits.length === 0 && (
          <div>
            <p className="muted">Ingen træf på “{needle}”.</p>
            {result.suggestions.length > 0 ? (
              <p className="small">
                Mente du{" "}
                {result.suggestions.map((name) => (
                  <button key={name} type="button" className="button" onClick={() => setQuery(name)}>
                    {name}
                  </button>
                ))}
              </p>
            ) : (
              <p className="small muted">Prøv et stofnavn, et handelsnavn eller firmaet bag medicinen.</p>
            )}
          </div>
        )}
        {result.hits.length > 0 && (
          <ul className="result-list">
            {result.hits.map((hit) => (
              <li key={`${hit.slug ?? "gap"}-${hit.name}`}>
                {hit.unavailable || !hit.slug ? (
                  <div className="plain">
                    <span className="result-top">
                      <strong>{hit.name}</strong>
                      <span className="tag quiet">Ingen oversigt</span>
                    </span>
                    <p className="small">{hit.explanation}</p>
                  </div>
                ) : (
                  <Link href={hit.kind === "category" ? `/kategori/${hit.slug}` : hit.kind === "disease" ? `/sygdom/${hit.slug}` : hit.kind === "company" ? `/firma/${hit.slug}${hit.anchor ? `#${hit.anchor}` : ""}` : `/stof/${hit.slug}`}>
                    <span className="result-top">
                      <strong>{hit.name}</strong>
                      {hit.kind === "category" ? (
                        <span className="tag">Gruppe</span>
                      ) : hit.kind === "disease" ? (
                        <span className="tag">Sygdom</span>
                      ) : hit.kind === "company" ? (
                        <span className="tag">Firma</span>
                      ) : (
                        hit.reports != null && <span>{formatInt(hit.reports)} indberetninger</span>
                      )}
                    </span>
                    {hit.kind === "substance" && hit.brands && hit.brands.length > 0 && (
                      <span className="small muted">
                        {hit.brands.join(", ")}
                        {hit.brandCount && hit.brandCount > hit.brands.length ? ` +${hit.brandCount - hit.brands.length} flere` : ""}
                        {hit.companies && hit.companies.length > 0 ? ` · ${hit.companies.join(", ")}` : ""}
                      </span>
                    )}
                    <span className="match-reason">{hit.reason}</span>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </search>
  );
}

