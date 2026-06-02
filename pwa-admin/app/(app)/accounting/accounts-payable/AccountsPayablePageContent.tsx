import { listAccountsPayableAction } from "@/features/accounting-accounts-payable/actions/accounts-payable.action";
import type { AccountsPayableListFilters } from "@/features/accounting-accounts-payable/types/accounts-payable.types";
import AccountsPayableDataGrid from "./ui/AccountsPayableDataGrid";

function parseSp(sp: Record<string, string | string[] | undefined>, key: string): string {
  const v = sp[key];
  if (Array.isArray(v)) {
    return typeof v[0] === "string" ? v[0] : "";
  }
  return typeof v === "string" ? v : "";
}

export default async function AccountsPayablePageContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  const filters: AccountsPayableListFilters = {};
  const sourceType = parseSp(sp, "sourceType");
  const status = parseSp(sp, "status");
  const payeeType = parseSp(sp, "payeeType");
  const fromDate = parseSp(sp, "fromDate");
  const toDate = parseSp(sp, "toDate");

  if (sourceType) filters.sourceType = sourceType;
  if (status) filters.status = status;
  if (payeeType) filters.payeeType = payeeType;
  if (fromDate) filters.fromDate = fromDate;
  if (toDate) filters.toDate = toDate;

  const { items } = await listAccountsPayableAction(filters);

  return <AccountsPayableDataGrid rows={items} />;
}
