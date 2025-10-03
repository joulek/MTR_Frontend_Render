// app/[locale]/admin/layout.jsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminLayoutClient from "./layout.client"; // <-- ton layout client renommé

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AdminLayout({ children, params: { locale } }) {
  const role = cookies().get("role")?.value || null;
  if (role !== "admin") {
    redirect(`/${locale}/login`);
  }
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
