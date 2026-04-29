import { Topbar } from "@/components/Topbar";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Topbar />
      <main>{children}</main>
    </>
  );
}
