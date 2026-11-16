import LoginForm from "./LoginForm";
export const metadata = { title: "Connexion — Makutano Mining Title Manager" };
export default function LoginPage() {
  return <LoginForm demo={process.env.NEXT_PUBLIC_DEMO_MODE !== "false"} />;
}
