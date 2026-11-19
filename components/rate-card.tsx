"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatInt, formatRate } from "@/lib/format";
import { RATE_DISCLAIMER, type SubstanceRate } from "@/lib/rates";

export function RateCard({ rate }: { rate: SubstanceRate }) {
  const first = rate.years[0]?.year;
  const last = rate.years[rate.years.length - 1]?.year;
  const span = first === last ? String(first) : `${first}–${last}`;
  return (
    <section className="card rate-card" aria-labelledby="indberetningsrate">
      <div className="rate-top">
        <div>
          <p className="kicker">Indberetningsrate</p>
          <h2 id="indberetningsrate">{formatRate(rate.per10k)} indberetninger pr. 10.000 brugere</h2>
          <p>
            I {span} er der {formatInt(rate.reports)} indberetninger og {formatInt(rate.users)} købende personer,
            lagt sammen år for år. Nævneren er ikke unikke personer på tværs af år. ATC-kode {rate.atc}.
          </p>
        </div>
        <aside className="rate-disclaimer">
          <strong>Læs dette før tallet</strong>
          <p>{RATE_DISCLAIMER}</p>
        </aside>
      </div>
      <div className="chart-box rate-chart" role="img" aria-label="Indberetninger pr. 10.000 brugere for hvert hele år">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rate.years} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#e7e0d2" vertical={false} />
            <XAxis dataKey="year" tick={{ fill: "#5e584e", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fill: "#5e584e", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={48}
              tickFormatter={(value) => formatRate(Number(value))}
            />
            <Tooltip
              formatter={(value) => [`${formatRate(Number(value))} pr. 10.000`, "Indberetningsrate"]}
              labelFormatter={(label) => `År ${label}`}
              contentStyle={{ borderRadius: 12, borderColor: "#d9d0c0" }}
            />
            <Bar dataKey="per10k" name="Pr. 10.000 brugere" fill="#1c6d64" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="table-scroll">
        <table>
          <caption className="sr-only">Indberetninger og købende personer pr. år. {RATE_DISCLAIMER}</caption>
          <thead>
            <tr>
              <th>År modtaget</th>
              <th className="num">Indberetninger</th>
              <th className="num">Brugere, der købte</th>
              <th className="num">Pr. 10.000</th>
            </tr>
          </thead>
          <tbody>
            {rate.years.map((row) => (
              <tr key={row.year}>
                <td>{row.year}</td>
                <td className="num">{formatInt(row.reports)}</td>
                <td className="num">{formatInt(row.users)}</td>
                <td className="num">{formatRate(row.per10k)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="small muted">
        Tælleren er indberetninger, Lægemiddelstyrelsen modtog det år. Nævneren er personer, der købte lægemidlet på
        apotek samme år. Data til {rate.latestMonth}. Kilde: Sundhedsdatastyrelsen, {rate.register}, målet «Antal
        brugere», offentliggjort i{" "}
        <a href={rate.sourceUrl}>{rate.sourceName}</a>.{" "}
        <a href={rate.medstatUrl}>Medstat.dk</a> lukkede 5. november 2026 og henviser hertil.
      </p>
    </section>
  );
}
