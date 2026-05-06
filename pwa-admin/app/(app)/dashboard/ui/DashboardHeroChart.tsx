"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Row = { label: string; ventas: number; compras: number };

const DATA: Row[] = [
  { label: "Ene", ventas: 38.2, compras: 22.1 },
  { label: "Feb", ventas: 35.4, compras: 20.8 },
  { label: "Mar", ventas: 41.0, compras: 24.3 },
  { label: "Abr", ventas: 44.6, compras: 23.7 },
  { label: "May", ventas: 42.1, compras: 25.2 },
  { label: "Jun", ventas: 48.3, compras: 27.0 },
  { label: "Jul", ventas: 46.7, compras: 26.1 },
  { label: "Ago", ventas: 51.2, compras: 28.4 },
  { label: "Sep", ventas: 49.8, compras: 27.9 },
  { label: "Oct", ventas: 54.0, compras: 29.1 },
  { label: "Nov", ventas: 52.4, compras: 28.6 },
  { label: "Dic", ventas: 57.1, compras: 30.2 },
];

function fmtMillion(n: number) {
  return `${n.toFixed(1)} M`;
}

const primary = "var(--color-primary, #1c2046)";
const secondary = "var(--color-secondary, #04c9e7)";
const muted = "var(--color-muted, #6b7280)";
const border = "var(--color-border, #c1c1c2)";

/**
 * Gráfico simulado (ventas vs compras) con gradientes y tipografía alineada al tema admin.
 */
export function DashboardHeroChart() {
  return (
    <div
      className="overflow-hidden rounded-xl border border-border bg-gradient-to-b from-background to-neutral/30 p-1 shadow-sm dark:from-background dark:to-neutral/20"
      data-test-id="dashboard-hero-chart"
    >
      <div className="rounded-[10px] border border-border/60 bg-background/80 px-4 pb-2 pt-4 backdrop-blur-sm">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-foreground">Evolución operativa</h2>
            <p className="text-sm text-muted-foreground">Ventas netas vs compras</p>
          </div>
          <p className="text-xs text-muted-foreground">Serie anual de demostración</p>
        </div>

        <div className="h-[min(360px,55vh)] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={DATA} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fillVentas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={primary} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={primary} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="fillCompras" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={secondary} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={secondary} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={border} strokeDasharray="4 8" vertical={false} opacity={0.65} />
              <XAxis
                dataKey="label"
                tick={{ fill: muted, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: border }}
              />
              <YAxis
                tick={{ fill: muted, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: border }}
                tickFormatter={fmtMillion}
                width={44}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "10px",
                  border: "1px solid var(--color-border, #c1c1c2)",
                  backgroundColor: "var(--color-background, #ffffff)",
                  color: "var(--color-foreground, #131615)",
                  fontSize: "12px",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                }}
                formatter={(value, name) => {
                  const v =
                    typeof value === "number"
                      ? `${value.toFixed(1)} M CLP`
                      : value === undefined
                        ? "—"
                        : String(value);
                  return [v, name === "ventas" ? "Ventas netas" : "Compras"];
                }}
                labelFormatter={(label) => `Mes: ${label}`}
              />
              <Legend
                wrapperStyle={{ fontSize: "12px", paddingTop: "12px" }}
                formatter={(value) => (value === "ventas" ? "Ventas netas" : "Compras")}
              />
              <Area
                type="monotone"
                dataKey="ventas"
                name="ventas"
                stroke={primary}
                strokeWidth={2.25}
                fill="url(#fillVentas)"
                dot={false}
                activeDot={{ r: 5, strokeWidth: 2, stroke: primary, fill: "var(--color-background,#fff)" }}
              />
              <Area
                type="monotone"
                dataKey="compras"
                name="compras"
                stroke={secondary}
                strokeWidth={2}
                fill="url(#fillCompras)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: secondary, fill: "var(--color-background,#fff)" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
