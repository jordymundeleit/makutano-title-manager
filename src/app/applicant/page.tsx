import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AppHeader } from "@/components/AppHeader";
import ApplicantDashboard from "./ApplicantDashboard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mes dossiers — Makutano Mining Title Manager" };

export default async function ApplicantPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "APPLICANT") redirect("/admin");
  return (
    <>
      <AppHeader user={{ name: user.name, role: user.role }} subtitle={user.company ?? "Espace demandeur"} />
      <ApplicantDashboard company={user.company ?? user.name} />
    </>
  );
}
