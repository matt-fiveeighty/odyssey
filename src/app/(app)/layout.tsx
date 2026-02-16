import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Header } from "@/components/layout/header";
import { AuthProvider } from "@/components/providers/AuthProvider";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
            {children}
          </main>
        </div>
      </div>
      <MobileNav />
    </AuthProvider>
  );
}
