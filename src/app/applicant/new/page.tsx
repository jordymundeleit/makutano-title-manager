import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AppHeader } from "@/components/AppHeader";
import NewApplicationForm from "./NewApplicationForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nouvelle demande — Makutano Mining Title Manager" };

export default async function NewApplicationPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "APPLICANT") redirect("/admin");
  return (
    <>
      <AppHeader user={{ name: user.name, role: user.role }} subtitle="Guichet unique" />
      <NewApplicationForm demo={process.env.NEXT_PUBLIC_DEMO_MODE !== "false"} />
    </>
  );
}
