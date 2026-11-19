"use client";

import { useMemo, useState } from "react";
import { benefitHarm } from "@/lib/effects";

type Mode = "per" | "percent";
type Severity = "Alvorlig" | "Mild" | "Hypotetisk";

type RiskField = { mode: Mode; value: string };
type HarmRow = { id: number; name: string; risk: RiskField; severity: Severity };

type Preset = {
  id: string;
  label: string;
  note: string;
  baseline: RiskField;
  efficacy: string;
  rows: Omit<HarmRow, "id">[];
};

const PRESETS: Preset[] = [
  {
    id: "example",
    label: "Eksempeltal",
    note: "Opdigtede tal, så regnestykket kan ses. De er ikke målt for nogen vaccine.",
    baseline: { mode: "per", value: "10000" },
    efficacy: "100",
    rows: [{ name: "Alvorlig reaktion", risk: { mode: "per", value: "5000" }, severity: "Alvorlig" }],
  },
  {
    id: "young",
    label: "Model: mænd 18–24 år",
    note: "CDC’s model, juli 2021, pr. million doser over 120 dage. Myokarditis er midten af 45–56 forventede tilfælde. Det er ikke det nordiske register.",
    baseline: { mode: "per", value: "1792" },
    efficacy: "95",
    rows: [{ name: "Myokarditis", risk: { mode: "per", value: "20000" }, severity: "Alvorlig" }],
  },
  {
    id: "older",
    label: "Model: mænd 30 år og ældre",
    note: "Samme CDC-model. Myokarditis er midten af 3–4 forventede tilfælde pr. million doser.",
    baseline: { mode: "per", value: "207" },
    efficacy: "95",
    rows: [{ name: "Myokarditis", risk: { mode: "per", value: "285714" }, severity: "Alvorlig" }],
  },
];

let nextId = 1;

function blankRow(): HarmRow {
  nextId += 1;
  return { id: nextId, name: "", risk: { mode: "per", value: "" }, severity: "Alvorlig" };
}

function proportion(field: RiskField): number | null {
  const raw = field.value.trim().replace("%", "").replace(",", ".");
  if (!raw) return null;
  const number = Number(raw);
  if (!Number.isFinite(number) || number < 0) return null;
  if (field.mode === "percent") return number > 100 ? null : number / 100;
  if (number === 0) return null;
  return 1 / number;
}

function formatCount(value: number): string {
  return value.toLocaleString("da-DK", { maximumFractionDigits: value >= 10 ? 0 : 1 });
}

function formatWhole(value: number): string {
  return Math.round(value).toLocaleString("da-DK");
}

export function HarmBalance() {
  const example = PRESETS[0];
  const [preset, setPreset] = useState(example.id);
  const [baseline, setBaseline] = useState<RiskField>(example.baseline);
  const [efficacy, setEfficacy] = useState(example.efficacy);
  const [rows, setRows] = useState<HarmRow[]>(example.rows.map((row) => ({ ...row, id: nextId++ })));
  const [note, setNote] = useState(example.note);

  function applyPreset(id: string) {
    const chosen = PRESETS.find((item) => item.id === id) ?? example;
    setPreset(chosen.id);
    setBaseline(chosen.baseline);
    setEfficacy(chosen.efficacy);
    setRows(chosen.rows.map((row) => ({ ...row, id: nextId++ })));
    setNote(chosen.note);
  }

  const parsed = useMemo(() => {
    const base = proportion(baseline);
    const effect = Number(efficacy.replace(",", ".")) / 100;
    const harms = rows.map((row) => ({ row, risk: proportion(row.risk) }));
    if (base === null || !Number.isFinite(effect)) return { error: "Udfyld udgangsrisiko og effekt." as const };
    const result = benefitHarm(
      base,
      effect,
      harms.map((item) => ({ risk: item.risk ?? 0 })),
    );
    if (!result) return { error: "Risiko skal ligge mellem 0 og 100 procent, og effekten mellem 0 og 100." as const };
    const max = Math.max(result.preventedPer100k, ...result.harms.map((harm) => harm.causedPer100k), 1);
    return { result, harms, max };
  }, [baseline, efficacy, rows]);

  return (
    <div className="harm-balance">
      <div className="preset-row" role="group" aria-label="Færdige tal">
        {PRESETS.map((item) => (
          <button key={item.id} type="button" className="button" aria-pressed={preset === item.id} onClick={() => applyPreset(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      <p className="small muted">{note}</p>
      <div className="effect-form">
        <fieldset className="risk-field">
          <legend>Udgangsrisiko for udfaldet, uden vaccinen</legend>
          <RiskControl field={baseline} onChange={setBaseline} />
        </fieldset>
        <label>
          Effekt mod det udfald, procent
          <input inputMode="decimal" value={efficacy} onChange={(event) => setEfficacy(event.target.value)} />
        </label>
      </div>
      <div className="harm-rows">
        {rows.map((row) => (
          <div className="harm-row" key={row.id}>
            <label>
              Reaktion
              <input value={row.name} onChange={(event) => updateRow(row.id, { name: event.target.value })} />
            </label>
            <fieldset className="risk-field">
              <legend>Risiko</legend>
              <RiskControl field={row.risk} onChange={(risk) => updateRow(row.id, { risk })} />
            </fieldset>
            <label>
              Alvor
              <select value={row.severity} onChange={(event) => updateRow(row.id, { severity: event.target.value as Severity })}>
                <option>Alvorlig</option>
                <option>Mild</option>
                <option>Hypotetisk</option>
              </select>
            </label>
            <button type="button" className="button" onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}>
              Fjern
            </button>
          </div>
        ))}
        <button type="button" className="button" onClick={() => setRows((current) => [...current, blankRow()])}>
          Tilføj reaktion
        </button>
      </div>
      {"error" in parsed ? (
        <p>{parsed.error}</p>
      ) : (
        <div className="balance">
          <p>
            <strong>NNT {parsed.result.nnt ? formatWhole(parsed.result.nnt) : "kan ikke regnes"}</strong>
            {" · "}
            {formatCount(parsed.result.preventedPer100k)} forebyggede udfald pr. 100.000 vaccinerede
          </p>
          <Bar label="Forebygget udfald" value={parsed.result.preventedPer100k} max={parsed.max} tone="benefit" />
          <ul className="balance-list">
            {parsed.harms.map((item, index) => {
              const stats = parsed.result.harms[index];
              return (
                <li key={item.row.id}>
                  <p>
                    <strong>{item.row.name || "Reaktion"}</strong>{" "}
                    <span className="tag quiet">{item.row.severity}</span>
                    {" · NNH "}
                    {stats.nnh ? formatWhole(stats.nnh) : "kan ikke regnes"}
                    {" · "}
                    {formatCount(stats.causedPer100k)} pr. 100.000
                  </p>
                  <Bar label={item.row.name || "Reaktion"} value={stats.causedPer100k} max={parsed.max} tone="harm" />
                </li>
              );
            })}
          </ul>
          <p className="small muted">
            Søjlerne er antal pr. 100.000 vaccinerede i den periode, tallene gælder. Alvorlige og milde reaktioner lægges
            ikke sammen, og de er ikke det samme som det forebyggede udfald.
          </p>
        </div>
      )}
    </div>
  );

  function updateRow(id: number, patch: Partial<HarmRow>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }
}

function RiskControl({ field, onChange }: { field: RiskField; onChange: (field: RiskField) => void }) {
  return (
    <div className="risk-control">
      <select value={field.mode} onChange={(event) => onChange({ ...field, mode: event.target.value as Mode })} aria-label="Sådan angives risikoen">
        <option value="per">1 ud af</option>
        <option value="percent">Procent</option>
      </select>
      <input inputMode="decimal" value={field.value} aria-label="Risikotal" onChange={(event) => onChange({ ...field, value: event.target.value })} />
    </div>
  );
}

function Bar({ label, value, max, tone }: { label: string; value: number; max: number; tone: "benefit" | "harm" }) {
  const width = Math.max(0, Math.min(100, (value / max) * 100));
  const dots = value > 0 && value <= 24 ? Math.round(value) : 0;
  return (
    <div className="balance-bar">
      <div className="balance-track" role="img" aria-label={`${label}: ${formatCount(value)} pr. 100.000`}>
        <span className={tone} style={{ width: `${width}%` }} />
      </div>
      {dots > 0 && (
        <div className="balance-dots" aria-hidden="true">
          {Array.from({ length: dots }, (_, index) => (
            <i key={index} className={tone} />
          ))}
        </div>
      )}
    </div>
  );
}
