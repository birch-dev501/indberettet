"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatInt } from "@/lib/format";
import { usePinScroll } from "@/components/pin-scroll";
import { groupSearch, type SearchGroupId, type SearchHit, type SearchIndex } from "@/lib/search";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function hitHref(hit: SearchHit): string {
  if (hit.href) return hit.href;
  if (hit.kind === "case" || hit.kind === "page") return hit.kind === "page" ? `/${hit.slug}` : `/boedesager#${hit.anchor ?? ""}`;
  if (hit.kind === "category") return `/kategori/${hit.slug}`;
  if (hit.kind === "disease") return `/sygdom/${hit.slug}`;
  if (hit.kind === "company") return `/firma/${hit.slug}${hit.anchor ? `#${hit.anchor}` : ""}`;
  return `/stof/${hit.slug}`;
}

export function useSearchIndex() {
  const [catalog, setCatalog] = useState<SearchIndex | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
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
  return { catalog, state };
}

export function GroupedResults({
  groups,
  query,
  active = -1,
  onActive,
  showAllLink = true,
  idPrefix = "soeg",
}: {
  groups: { id: SearchGroupId; label: string; total: number; hits: SearchHit[] }[];
  query: string;
  active?: number;
  onActive?: (index: number) => void;
  showAllLink?: boolean;
  idPrefix?: string;
}) {
  let cursor = 0;
  return (
    <div className="result-groups" role="listbox">
      {groups.map((group) => (
        <section key={group.id} className="result-group">
          <h3>
            {group.label} <span className="tag quiet">{formatInt(group.total)}</span>
          </h3>
          <ul className="result-list">
            {group.hits.map((hit) => {
              const index = cursor;
              cursor += 1;
              const current = index === active;
              return (
                <li key={`${group.id}-${hit.slug}-${hit.anchor ?? ""}-${hit.name}`}>
                  <Link
                    href={hitHref(hit)}
                    role="option"
                    id={`${idPrefix}-${index}`}
                    aria-selected={current}
                    className={current ? "is-active" : undefined}
                    onMouseEnter={() => onActive?.(index)}
                  >
                    <span className="result-top">
                      <strong>{hit.name}</strong>
                      {hit.reports != null && hit.kind !== "company" ? <span>{formatInt(hit.reports)}</span> : null}
                    </span>
                    <span className="match-reason">{hit.reason}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {showAllLink && query.trim().length >= 2 && (
        <p className="see-all">
          <Link href={`/soeg/?q=${encodeURIComponent(query.trim())}`}>Vis alle resultater</Link>
        </p>
      )}
    </div>
  );
}

export function SearchPanel({
  placeholder = "Søg på stof, mærke, firma eller sag",
  autoFocus = false,
  compact = false,
  initial = "",
}: {
  placeholder?: string;
  autoFocus?: boolean;
  compact?: boolean;
  initial?: string;
}) {
  const { catalog, state } = useSearchIndex();
  const [query, setQuery] = useState(initial);
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(initial.trim().length >= 2);
  const inputId = useId();
  const listId = useId();
  const optionPrefix = useId().replace(/:/g, "");
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLElement>(null);
  const showingRef = useRef(false);
  const spoken = useRef(0);
  const closeRef = useRef<() => void>(() => {});
  const [status, setStatus] = useState("");
  const router = useRouter();
  usePinScroll(inputRef);

  function announce(message: string) {
    spoken.current += 1;
    const ticket = spoken.current;
    setStatus("");
    requestAnimationFrame(() => {
      if (spoken.current === ticket) setStatus(message);
    });
  }

  function closeList() {
    if (showingRef.current) announce("Listen er lukket");
    setOpen(false);
  }
  closeRef.current = closeList;

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node) || rootRef.current?.contains(target)) return;
      if (target instanceof Element && target.closest("a")) return;
      closeRef.current();
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);
  const needle = query.trim();
  const groups = useMemo(
    () => (needle.length < 2 || !catalog ? [] : groupSearch(catalog, needle, compact ? 4 : 5)),
    [catalog, compact, needle],
  );
  const flatCount = groups.reduce((sum, group) => sum + group.hits.length, 0);
  const listVisible = open && needle.length >= 2 && (groups.length > 0 || state === "ready");
  showingRef.current = listVisible;

  function onEscape(event: KeyboardEvent) {
    if (event.key !== "Escape") return;
    event.preventDefault();
    if (listVisible) {
      closeList();
      return;
    }
    setQuery("");
    setActive(-1);
    announce("Søgningen er ryddet");
  }

  function move(next: number) {
    if (flatCount === 0) return;
    const bounded = (next + flatCount) % flatCount;
    setActive(bounded);
    setOpen(true);
    document.getElementById(`${optionPrefix}-${bounded}`)?.scrollIntoView({ block: "nearest" });
  }

  return (
    <search
      ref={rootRef}
      className={compact ? "search search-compact" : "search"}
      data-search={compact ? "header" : "page"}
      onKeyDown={onEscape}
    >
      <label className="kicker" htmlFor={inputId}>
        Søg
      </label>
      <div className="search-field">
      <input
        id={inputId}
        ref={inputRef}
        role="searchbox"
        aria-autocomplete="list"
        aria-controls={listId}
        aria-activedescendant={active >= 0 ? `${optionPrefix}-${active}` : undefined}
        autoFocus={autoFocus}
        value={query}
        placeholder={placeholder}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        onFocus={() => {
          if (query.trim().length >= 2) setOpen(true);
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(-1);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            move(active + 1);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            move(active < 0 ? flatCount - 1 : active - 1);
          } else if (event.key === "Enter") {
            if (active >= 0) {
              event.preventDefault();
              document.getElementById(`${optionPrefix}-${active}`)?.click();
            } else if (needle.length >= 2) {
              event.preventDefault();
              router.push(`/soeg/?q=${encodeURIComponent(needle)}`);
            }
          }
        }}
      />
      {query.length > 0 && (
        <button
          type="button"
          className="search-clear"
          aria-label="Ryd søgning"
          onClick={() => {
            setQuery("");
            setActive(-1);
            setOpen(false);
            announce("Søgningen er ryddet");
            inputRef.current?.focus();
          }}
        >
          ✕
        </button>
      )}
      </div>
      <p className="sr-only" aria-live="polite">{status}</p>
      <div id={listId}>
        {state === "loading" && !compact && <p className="muted">Henter register…</p>}
        {state === "error" && <p className="warning-note">Søgningen kunne ikke gennemføres. Prøv igen.</p>}
        {open && state === "ready" && needle.length >= 2 && groups.length === 0 && (
          <div className="empty-search">
            <p className="muted">Ingen træf på “{needle}”.</p>
          </div>
        )}
        {open && groups.length > 0 && (
          <GroupedResults groups={groups} query={needle} active={active} onActive={setActive} idPrefix={optionPrefix} />
        )}
      </div>
    </search>
  );
}
