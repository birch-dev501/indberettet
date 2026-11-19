"use client";

import { useMemo, useState } from "react";
import { bayesCounts } from "@/lib/bayes";

function parsePercent(value: string): number | null {
  const cleaned = value.trim().replace("%", "").replace(",", ".");
  if (!cleaned) return null;
  const number = Number(cleaned);
  if (!Number.isFinite(number)) return null;
  return number / 100;
}

function formatCount(value: number): string {
  return value.toLocaleString("da-DK");
}

function formatPercent(value: number | null): string {
  if (value === null) return "kan ikke regnes";
  return `${(value * 100).toLocaleString("da-DK", { maximumFractionDigits: 1, minimumFractionDigits: 1 })} %`;
}

export function TestCalculator() {
  const [prevalence, setPrevalence] = useState("0,1");
  const [sensitivity, setSensitivity] = useState("54,7");
  const [specificity, setSpecificity] = useState("99,7");
  const result = useMemo(() => {
    const prior = parsePercent(prevalence);
    const sens = parsePercent(sensitivity);
    const spec = parsePercent(specificity);
    if (prior === null || sens === null || spec === null) return { error: "Skriv tre tal." as const };
    const counts = bayesCounts(10_000, prior, sens, spec);
    if (!counts) return { error: "Hvert tal skal ligge mellem 0 og 100 procent." as const };
    return { counts };
  }, [prevalence, sensitivity, specificity]);

  return (
    <form className="effect-form" onSubmit={(event) => event.preventDefault()}>
      <label>
        Forekomst, procent
        <input inputMode="decimal" value={prevalence} onChange={(event) => setPrevalence(event.target.value)} />
      </label>
      <label>
        Sensitivitet, procent
        <input inputMode="decimal" value={sensitivity} onChange={(event) => setSensitivity(event.target.value)} />
      </label>
      <label>
        Specificitet, procent
        <input inputMode="decimal" value={specificity} onChange={(event) => setSpecificity(event.target.value)} />
      </label>
      {"error" in result ? (
        <p className="warning-note">{result.error}</p>
      ) : (
        <div>
          <p>
            Af 10.000 testede er {formatCount(result.counts.sick)} syge og {formatCount(result.counts.well)} raske.
          </p>
          <p>
            Sandt positive {formatCount(result.counts.truePositive)}. Falsk positive {formatCount(result.counts.falsePositive)}.
            Sandt negative {formatCount(result.counts.trueNegative)}. Falsk negative {formatCount(result.counts.falseNegative)}.
          </p>
          <p>
            Positiv prædiktiv værdi {formatPercent(result.counts.ppv)}. Negativ prædiktiv værdi {formatPercent(result.counts.npv)}.
          </p>
        </div>
      )}
    </form>
  );
}
