import DteReceiptsDataGrid from "./ui/DteReceiptsDataGrid";

export const dynamic = "force-dynamic";

export default function DteReceiptsPage() {
  return (
    <div className="min-h-0 min-w-0 p-0" data-test-id="dte-receipts-page-root">
      <DteReceiptsDataGrid rows={[]} total={0} />
    </div>
  );
}
