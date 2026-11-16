import Link from "next/link";
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-5xl font-bold">Page introuvable</h1>
      <p className="mt-3 text-muted">Cette adresse n'existe pas ou a été déplacée.</p>
      <Link href="/" className="btn-primary mt-6">Retour à la carte</Link>
    </main>
  );
}
