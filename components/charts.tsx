"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AgeRow, YearRow } from "@/lib/types";
import { formatInt } from "@/lib/format";

function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 720px)");
    const update = () => setNarrow(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return narrow;
}

const nonserious = "#1c6d64";
const serious = "#c56a32";
const fatal = "#7a2430";

export function YearChart({ years, stacked }: { years: YearRow[]; stacked: boolean }) {
  if (years.length === 0) return <p className="muted">Ingen indberetninger i dette udsnit.</p>;
  return (
    <div className="chart-box" role="img" aria-label="Søjlediagram over indberetninger fordelt på år">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={years} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#e7e0d2" vertical={false} />
          <XAxis dataKey="year" tick={{ fill: "#5e584e", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fill: "#5e584e", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={48}
            tickFormatter={(value) => formatInt(Number(value))}
          />
          <Tooltip
            formatter={(value, name) => [formatInt(Number(value)), name]}
            labelFormatter={(label) => `År ${label}`}
            contentStyle={{ borderRadius: 12, borderColor: "#d9d0c0" }}
          />
          {stacked ? (
            <>
              <Bar dataKey="nonserious" name="Ikke-alvorlig" stackId="year" fill={nonserious} />
              <Bar dataKey="serious" name="Alvorlig" stackId="year" fill={serious} />
              <Bar dataKey="fatal" name="Dødsfald" stackId="year" fill={fatal} radius={[3, 3, 0, 0]} />
            </>
          ) : (
            <Bar dataKey="reports" name="Indberetninger" fill={nonserious} radius={[3, 3, 0, 0]} />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export type AgeSeriousnessRow = {
  label: string;
  nonserious: number;
  serious: number;
  fatal: number;
};

export function AgeSeriousnessChart({ rows }: { rows: AgeSeriousnessRow[] }) {
  const narrow = useNarrow();
  if (rows.length === 0 || rows.every((row) => row.nonserious + row.serious + row.fatal === 0)) {
    return <p className="muted">Ingen aldersfordeling i udtrækket.</p>;
  }
  const height = Math.min(460, Math.max(200, rows.length * 36 + 24));
  return (
    <div
      className="chart-box"
      style={{ height }}
      role="img"
      aria-label="Stablede søjler med indberetninger pr. aldersgruppe, fordelt på ikke-alvorlige, alvorlige og dødsfald"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
          <CartesianGrid stroke="#e7e0d2" horizontal={false} />
          <XAxis type="number" tick={{ fill: "#5e584e", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="label"
            width={narrow ? 64 : 78}
            tick={{ fill: "#1c1915", fontSize: narrow ? 11 : 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value, name) => [formatInt(Number(value)), name]}
            contentStyle={{ borderRadius: 12, borderColor: "#d9d0c0" }}
          />
          <Bar dataKey="nonserious" name="Ikke-alvorlig" stackId="age" fill={nonserious} />
          <Bar dataKey="serious" name="Alvorlig" stackId="age" fill={serious} />
          <Bar dataKey="fatal" name="Dødsfald" stackId="age" fill={fatal} radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export type CategoryCompareRow = {
  name: string;
  nonserious: number;
  serious: number;
  fatal: number;
};

export function CategoryCompareChart({ rows }: { rows: CategoryCompareRow[] }) {
  const narrow = useNarrow();
  if (rows.length === 0) return <p className="muted">Ingen stoffer i gruppen.</p>;
  const height = Math.min(560, Math.max(200, rows.length * 38 + 16));
  return (
    <div
      className="chart-box"
      style={{ height }}
      role="img"
      aria-label="Sammenligning af indberetninger for stofferne i gruppen, fordelt på ikke-alvorlige, alvorlige og dødsfald"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
          <CartesianGrid stroke="#e7e0d2" horizontal={false} />
          <XAxis type="number" tick={{ fill: "#5e584e", fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(value) => formatInt(Number(value))} />
          <YAxis
            type="category"
            dataKey="name"
            width={narrow ? 92 : 176}
            interval={0}
            tick={{ fill: "#1c1915", fontSize: narrow ? 11 : 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip formatter={(value, name) => [formatInt(Number(value)), name]} contentStyle={{ borderRadius: 12, borderColor: "#d9d0c0" }} />
          <Bar dataKey="nonserious" name="Ikke-alvorlig" stackId="group" fill={nonserious} />
          <Bar dataKey="serious" name="Alvorlig" stackId="group" fill={serious} />
          <Bar dataKey="fatal" name="Dødsfald" stackId="group" fill={fatal} radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AgeChart({ ages }: { ages: AgeRow[] }) {
  const narrow = useNarrow();
  if (ages.length === 0) return <p className="muted">Ingen aldersoplysninger i dette udsnit.</p>;
  return (
    <div className="chart-box tall" role="img" aria-label="Søjlediagram over indberetninger fordelt på aldersgruppe">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={ages} layout="vertical" margin={{ top: 8, right: 12, left: 8, bottom: 0 }}>
          <CartesianGrid stroke="#e7e0d2" horizontal={false} />
          <XAxis type="number" tick={{ fill: "#5e584e", fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="label"
            width={narrow ? 68 : 92}
            tick={{ fill: "#1c1915", fontSize: narrow ? 11 : 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip formatter={(value) => [formatInt(Number(value)), "Indberetninger"]} contentStyle={{ borderRadius: 12, borderColor: "#d9d0c0" }} />
          <Bar dataKey="reports" name="Indberetninger" fill="#1c6d64" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
