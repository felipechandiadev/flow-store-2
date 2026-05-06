import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { CompanyRequest } from "@/features/company/infrastructure/company.request";
import { FindMyOpenCashSessionUseCase } from "@/features/session/application/find-my-open-cash-session.usecase";
import PosTopBar from "./PosTopBar";

export default async function PosTopBarServer() {
  const session = await getServerSession(authOptions);
  const personName = session?.user?.name ?? null;
  const userRole = (session?.user as any)?.role ?? null;

  const openSession = await FindMyOpenCashSessionUseCase.execute();
  const pointOfSaleName =
    openSession.success ? openSession.pointOfSaleName : null;

  const company = await CompanyRequest.getDetails();
  const companyTradeName = company?.nombreFantasia ?? null;

  return (
    <PosTopBar
      pointOfSaleName={pointOfSaleName}
      companyTradeName={companyTradeName}
      personName={personName}
      userRole={userRole}
    />
  );
}

