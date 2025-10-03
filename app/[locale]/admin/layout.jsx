// @ts-nocheck

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminLayoutClient from "./layout.client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AdminLayout({ children, params }) {
  const locale = params?.locale || "fr";
  const role = cookies().get("role")?.value || null;

  if (role !== "admin") {
    redirect(`/${locale}/login`);
  }

  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
