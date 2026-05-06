import { Card } from "@/shared/components/Cards";
import { StatisticsCard } from "@/shared/components/Cards";
import { DashboardHeroChart } from "./DashboardHeroChart";

function fmtMoney(n: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtPct(n: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(n / 100);
}

/** Serie simulada para mini barras (últimos 12 períodos). */
function MiniBars({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-16 items-end gap-0.5" aria-hidden>
      {values.map((v, i) => (
        <div
          key={i}
          className="min-w-[4px] flex-1 rounded-sm bg-secondary/35 transition-colors dark:bg-secondary/25"
          style={{ height: `${Math.max(8, (v / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

function ProgressRow({ label, valuePct }: { label: string; valuePct: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between gap-2 text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums font-medium text-foreground">{Math.round(valuePct)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${Math.min(100, Math.max(0, valuePct))}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Panel principal: KPIs y bloques simulados alineados al diseño admin (tokens, StatisticsCard, Card).
 */
export function DashboardPanel() {
  const salesSpark = [42, 38, 55, 61, 48, 72, 68, 75, 82, 79, 88, 91];
  const purchaseSpark = [28, 31, 29, 35, 33, 40, 38, 42, 41, 45, 44, 47];

  return (
    <div className="flex w-full min-w-0 flex-col gap-8" data-test-id="dashboard-panel">
      <DashboardHeroChart />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">Negocio</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatisticsCard
            label="Ventas netas (MTD)"
            value={fmtMoney(48_250_000)}
            hint="vs mes anterior +6,2%"
            tone="primary"
            data-test-id="dashboard-kpi-sales-net"
          />
          <StatisticsCard
            label="Margen bruto estimado"
            value={fmtPct(34.8)}
            hint="sobre ventas del período"
            tone="success"
            data-test-id="dashboard-kpi-margin"
          />
          <StatisticsCard
            label="Ticket promedio"
            value={fmtMoney(62_400)}
            hint="POS + facturación"
            tone="info"
            data-test-id="dashboard-kpi-ticket"
          />
          <StatisticsCard
            label="Órdenes / tickets"
            value="1 847"
            hint="transacciones confirmadas"
            tone="warning"
            data-test-id="dashboard-kpi-orders"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">Compras e inventario</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatisticsCard
            label="Compras registradas"
            value={fmtMoney(21_180_000)}
            hint="OC + facturas recibidas"
            tone="primary"
          />
          <StatisticsCard
            label="Valor inventario"
            value={fmtMoney(312_600_000)}
            hint="costo estándar · todas las bodegas"
            tone="info"
          />
          <StatisticsCard
            label="Rotación (días)"
            value="42"
            hint="objetivo < 45 días"
            tone="success"
          />
          <StatisticsCard
            label="SKU bajo mínimo"
            value="37"
            hint="requieren reposición"
            tone="warning"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">Finanzas y cobranza</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatisticsCard label="Cuentas por cobrar" value={fmtMoney(18_900_000)} hint="saldo vivo" tone="primary" />
          <StatisticsCard label="Cuentas por pagar" value={fmtMoney(12_340_000)} hint="proveedores" tone="warning" />
          <StatisticsCard label="Días cartera (DSO)" value="31" hint="promedio ponderado" tone="info" />
          <StatisticsCard label="Liquidez (ratio)" value="1,28" hint="activo corriente / pasivo corriente" tone="success" />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">Tesorería y caja</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatisticsCard label="Saldo bancos consolidado" value={fmtMoney(96_700_000)} hint="todas las cuentas" tone="primary" />
          <StatisticsCard label="Efectivo / cajas" value={fmtMoney(5_820_000)} hint="hubs + POS no depositado" tone="info" />
          <StatisticsCard label="Sesiones de caja abiertas" value="6" hint="en 4 sucursales" tone="success" />
          <StatisticsCard label="Conciliaciones pendientes" value="3" hint="últimos 30 días" tone="warning" />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card
          title="Tendencia ventas vs compras"
          subtitle="Serie simulada · últimos 12 períodos"
          headerEnd={<span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Demo</span>}
          fillHeight
          content={
            <div className="grid gap-6">
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Ventas (índice)</p>
                <MiniBars values={salesSpark} />
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Compras (índice)</p>
                <MiniBars values={purchaseSpark} />
              </div>
            </div>
          }
          data-test-id="dashboard-chart-card"
        />

        <Card
          title="Metas del período"
          subtitle="Avance sobre objetivos internos (simulado)"
          content={
            <div className="grid gap-4 pt-1">
              <ProgressRow label="Meta ventas mensual" valuePct={78} />
              <ProgressRow label="Recuperación cartera 30d" valuePct={64} />
              <ProgressRow label="Cobertura inventario crítico" valuePct={92} />
              <ProgressRow label="Cierres contables al día" valuePct={100} />
            </div>
          }
          data-test-id="dashboard-goals-card"
        />
      </div>

      <Card
        title="Operación y cumplimiento"
        subtitle="Colas típicas del ERP — valores de ejemplo"
        content={
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-border bg-background px-3 py-2">
              <dt className="text-xs text-muted-foreground">DTE pendientes validación</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums text-foreground">14</dd>
            </div>
            <div className="rounded-lg border border-border bg-background px-3 py-2">
              <dt className="text-xs text-muted-foreground">OC sin recepción completa</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums text-foreground">22</dd>
            </div>
            <div className="rounded-lg border border-border bg-background px-3 py-2">
              <dt className="text-xs text-muted-foreground">Transferencias entre bodegas en curso</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums text-foreground">8</dd>
            </div>
            <div className="rounded-lg border border-border bg-background px-3 py-2">
              <dt className="text-xs text-muted-foreground">Remuneraciones período (liquidación)</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums text-foreground">{fmtMoney(38_200_000)}</dd>
            </div>
            <div className="rounded-lg border border-border bg-background px-3 py-2">
              <dt className="text-xs text-muted-foreground">Impuestos declaración próx. venc.</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums text-foreground">{fmtMoney(4_050_000)}</dd>
            </div>
            <div className="rounded-lg border border-border bg-background px-3 py-2">
              <dt className="text-xs text-muted-foreground">Clientes nuevos (30d)</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums text-foreground">126</dd>
            </div>
          </dl>
        }
        data-test-id="dashboard-ops-card"
      />

      <p className="text-center text-xs text-muted-foreground">
        Los valores son demostración. Conectarán a reportes y agregados del backend según roadmap.
      </p>
    </div>
  );
}
