import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { GetCompanyUseCase } from "@/features/settings-company/application/get-company.usecase";
import { CompanyProvider } from "@/providers/CompanyProvider";
import AppProviders from "./AppProviders";
import AppShellLayoutClient from "./AppShellLayoutClient";

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const company = session != null ? await GetCompanyUseCase.execute() : null;

  return (
    <AppProviders session={session}>
      <CompanyProvider initialCompany={company}>
        <AppShellLayoutClient>{children}</AppShellLayoutClient>
      </CompanyProvider>
    </AppProviders>
  );
}
