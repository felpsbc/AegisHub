import { Topbar } from "@/components/Topbar";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Topbar />
      <main>{children}</main>
    </>
  );
}
