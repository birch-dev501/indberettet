"use client";

import { useMemo, useState } from "react";
import { effectMeasures } from "@/lib/effects";

function parsePercent(value: string): number | null {
  const cleaned = value.trim().replace("%", "").replace(",", ".");
  if (!cleaned) return null;
  const number = Number(cleaned);
  if (!Number.isFinite(number)) return null;
  return number / 100;
}

function formatDa(value: number, digits: number): string {
  return value.toLocaleString("da-DK", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

export function EffectCalculator() {
  const [treated, setTreated] = useState("0,044");
  const [control, setControl] = useState("0,884");
  const result = useMemo(() => {
    const a = parsePercent(treated);
    const b = parsePercent(control);
    if (a === null || b === null) return { error: "Skriv to tal." as const };
    const measures = effectMeasures(a, b);
    if (!measures) return { error: "Risikoen skal ligge mellem 0 og 100 procent." as const };
    return { measures };
  }, [treated, control]);

  return (
    <form className="effect-form" onSubmit={(event) => event.preventDefault()}>
      <label>
        Risiko med behandling, procent
        <input inputMode="decimal" value={treated} onChange={(event) => setTreated(event.target.value)} />
      </label>
      <label>
        Risiko uden behandling, procent
        <input inputMode="decimal" value={control} onChange={(event) => setControl(event.target.value)} />
      </label>
      {"error" in result ? (
        <p>{result.error}</p>
      ) : (
        <dl className="effect-result">
          <div>
            <dt>Relativ reduktion</dt>
            <dd>{result.measures.rrr === null ? "Kan ikke regnes" : `${formatDa(result.measures.rrr * 100, 1)} %`}</dd>
          </div>
          <div>
            <dt>Absolut forskel</dt>
            <dd>{formatDa(result.measures.arr * 100, 2)} procentpoint</dd>
          </div>
          <div>
            <dt>{result.measures.nnh ? "NNH" : "NNT"}</dt>
            <dd>
              {result.measures.nnt
                ? formatDa(result.measures.nnt, 0)
                : result.measures.nnh
                  ? formatDa(result.measures.nnh, 0)
                  : "Ingen forskel"}
            </dd>
          </div>
        </dl>
      )}
      <p className="small muted">
        Felterne er udfyldt med andelene fra eksemplet: 0,044 % og 0,884 %. NNT er 1 divideret med den absolutte
        forskel og afrundet til nærmeste hele tal. Bliver risikoen højere med behandlingen, vises NNH i stedet.
      </p>
    </form>
  );
}
