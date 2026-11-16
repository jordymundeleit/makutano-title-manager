import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AppHeader } from "@/components/AppHeader";
import AdminShell from "./AdminShell";

export const dynamic = "force-dynamic";
export const metadata = { title: "Administration — Makutano Mining Title Manager" };

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role === "APPLICANT") redirect("/applicant");
  return (
    <>
      <AppHeader user={{ name: user.name, role: user.role }} subtitle={user.role === "ADMIN" ? "Direction du Cadastre Minier" : "Instruction technique SIG"} />
      <AdminShell role={user.role} />
    </>
  );
}
