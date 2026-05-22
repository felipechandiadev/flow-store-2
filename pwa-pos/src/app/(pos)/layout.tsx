import PosTopBarServer from "@/shared/components/PosTopBar/PosTopBarServer";
import PosLayoutChrome from "./PosLayoutChrome";

export default async function PosLayout({ children }: { children: React.ReactNode }) {
  return <PosLayoutChrome topBar={<PosTopBarServer />}>{children}</PosLayoutChrome>;
}
