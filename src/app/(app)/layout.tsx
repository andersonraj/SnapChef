import BottomNav from "@/components/layout/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="mx-auto min-h-screen max-w-2xl pb-32">{children}</div>
      <BottomNav />
    </>
  );
}
