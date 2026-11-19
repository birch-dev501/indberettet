"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { GroupedResults, useSearchIndex } from "@/components/search-panel";
import { groupSearch, type SearchGroupId } from "@/lib/search";

export function FullSearch() {
  const params = useSearchParams();
  const initial = params.get("q") ?? "";
  const { catalog, state } = useSearchIndex();
  const [filter, setFilter] = useState<SearchGroupId | "alle">("alle");
  const groups = useMemo(
    () => (initial.trim().length < 2 || !catalog ? [] : groupSearch(catalog, initial, 40)),
    [catalog, initial],
  );
  const visible = filter === "alle" ? groups : groups.filter((group) => group.id === filter);
  return (
    <>
      <p className="kicker">Søgning</p>
      <h1>Resultater for «{initial || "…"}»</h1>
      {state === "loading" && <p className="muted">Henter register…</p>}
      {state === "error" && <p className="warning-note">Søgningen kunne ikke gennemføres.</p>}
      {state === "ready" && groups.length === 0 && <p>Ingen træf.</p>}
      {groups.length > 0 && (
        <div className="term-tools" role="tablist" aria-label="Afgræns typen">
          <button type="button" className={filter === "alle" ? "button" : "button quiet"} onClick={() => setFilter("alle")}>
            Alle
          </button>
          {groups.map((group) => (
            <button
              key={group.id}
              type="button"
              className={filter === group.id ? "button" : "button quiet"}
              onClick={() => setFilter(group.id)}
            >
              {group.label} ({group.total})
            </button>
          ))}
        </div>
      )}
      <GroupedResults groups={visible} query={initial} showAllLink={false} />
    </>
  );
}
