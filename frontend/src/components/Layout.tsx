// components/Layout.tsx
import type { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-[#003A81]">
      {/* PAGE CONTENT */}
      <main className="flex-1">{children}</main>

      {/* UNIVERSAL FOOTER */}
      <footer className="bg-[#003A81] text-white text-center py-4 text-sm mt-6">
        © Duke Kunshan University · Kallisto.
      </footer>
    </div>
  );
}
