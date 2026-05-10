export const dynamic = "force-dynamic";

import { listPointsOfSaleForSetup } from "@/features/session/actions/session-setup.action";
import { findMyOpenCashSessionAction } from "@/features/session/actions/cash-session.action";
import SessionSetupForm from "./SessionSetupForm";

export default async function Page() {
  const [points, mySession] = await Promise.all([
    listPointsOfSaleForSetup(),
    findMyOpenCashSessionAction(),
  ]);

  const pointsOfSale = points.success ? points.pointsOfSale : [];

  const myOpenSession =
    mySession.success && mySession.cashSessionId
      ? {
          cashSessionId: mySession.cashSessionId,
          pointOfSaleId: mySession.pointOfSaleId,
          pointOfSaleName: mySession.pointOfSaleName,
          branchName: mySession.branchName,
        }
      : null;

  return (
    <div>
      <SessionSetupForm
        pointsOfSale={pointsOfSale}
        initialError={points.success ? "" : points.error}
        myOpenSession={myOpenSession}
      />
    </div>
  );
}
