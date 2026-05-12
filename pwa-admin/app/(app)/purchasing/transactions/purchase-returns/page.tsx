import Link from "next/link";
import { listPurchaseReturnsForPage } from "@/features/purchasing-purchase-returns/actions/purchase-return.action";

export const dynamic = "force-dynamic";

export default async function PurchaseReturnsListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt((sp.page as string) || "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt((sp.limit as string) || "25", 10) || 25));

  const res = await listPurchaseReturnsForPage({ page, limit });

  return (
    <div className="min-w-0 max-w-5xl" data-test-id="purchase-returns-list-page">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Listado</h2>
        <Link
          href="/purchasing/transactions/purchase-returns/new"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          data-test-id="purchase-returns-link-new"
        >
          Nueva devolución
        </Link>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{res.total} devoluciones</p>

      <div className="mt-4 overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted/30">
            <tr className="text-left">
              <th className="px-3 py-2 font-medium">Fecha</th>
              <th className="px-3 py-2 font-medium">Proveedor</th>
              <th className="px-3 py-2 font-medium">Referencia</th>
              <th className="px-3 py-2 font-medium">Total</th>
              <th className="px-3 py-2 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {res.data.map((x) => {
              const person = x.supplier?.person;
              const supplierName =
                person?.businessName ||
                [person?.firstName, person?.lastName].filter(Boolean).join(" ") ||
                x.supplier?.id ||
                "-";
              return (
                <tr key={x.id} className="border-t border-border">
                  <td className="px-3 py-2 whitespace-nowrap">{new Date(x.createdAt).toLocaleString()}</td>
                  <td className="px-3 py-2">{supplierName}</td>
                  <td className="px-3 py-2">{x.externalReference || "-"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{Number(x.total || 0).toLocaleString()}</td>
                  <td className="px-3 py-2">{x.status}</td>
                </tr>
              );
            })}
            {res.data.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-muted-foreground" colSpan={5}>
                  No hay devoluciones aún.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
