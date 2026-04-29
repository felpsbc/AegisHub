import { AppGuard } from "@/components/AppGuard";
import { Topbar } from "@/components/Topbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Topbar />
      <AppGuard>
        <main>{children}</main>
      </AppGuard>
    </>
  );
}
