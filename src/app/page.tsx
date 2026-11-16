import { getSessionUser } from "@/lib/auth";
import MapExplorer from "./MapExplorer";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getSessionUser();
  return <MapExplorer user={user ? { name: user.name, role: user.role } : null} />;
}
