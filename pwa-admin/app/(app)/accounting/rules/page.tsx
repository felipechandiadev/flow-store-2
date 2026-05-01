import { Suspense } from "react";
import { listAccountingRulesForPage } from "@/features/accounting-rules/actions/accounting-rule.action";
import { listChartOfAccountsForPage } from "@/features/accounting-chart-of-accounts/actions/chart-of-accounts.action";
import { listTaxesForPage } from "@/features/accounting-taxes/actions/tax.action";
import { listExpenseCategoriesForPage } from "@/features/expense-categories/actions/expense-category.action";
import { AccountingRulesCollection } from "./ui/AccountingRulesCollection";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [rulesResult, accountsResult, taxes, expenseCategories] = await Promise.all([
    listAccountingRulesForPage(),
    listChartOfAccountsForPage({ includeInactive: true }),
    listTaxesForPage(),
    listExpenseCategoriesForPage(),
  ]);

  const rules = rulesResult.success ? rulesResult.rules : [];
  const hierarchy = accountsResult.success ? accountsResult.data.hierarchy : [];

  return (
    <Suspense
      fallback={
        <div className="p-4 text-sm text-muted md:p-6" data-test-id="accounting-rules-page-skeleton">
          Cargando…
        </div>
      }
    >
      <AccountingRulesCollection
        initialRules={rules}
        accountsHierarchy={hierarchy}
        taxes={taxes}
        expenseCategories={expenseCategories}
      />
    </Suspense>
  );
}

