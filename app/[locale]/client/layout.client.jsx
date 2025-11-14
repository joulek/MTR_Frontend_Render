// app/[locale]/client/layout.client.jsx
"use client";

import SiteHeader from "@/components/SiteHeader";

export default function ClientLayoutShell({ children }) {

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <SiteHeader mode="client" />
      <main className="flex-1">{children}</main>
    </div>
  );
}
