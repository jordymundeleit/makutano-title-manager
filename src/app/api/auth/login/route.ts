import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, password, role } = await request.json();
    
    // Le mot de passe universel que tu as publié sur LinkedIn
    const UNIVERSAL_PASSWORD = process.env.DEMO_UNIVERSAL_PASSWORD || "Makutano2026!";

    // On vérifie si le mot de passe correspond au mot de passe universel de démo
    if (password !== UNIVERSAL_PASSWORD) {
      return NextResponse.json(
        { success: false, message: "Mot de passe de démo incorrect." }, 
        { status: 401 }
      );
    }

    // Détermination de la redirection selon le rôle choisi par l'utilisateur
    let redirectPath = "/applicant";
    if (role === "ADMIN" || role === "ADMIN_MINISTERE") {
      redirectPath = "/admin";
    } else if (role === "INSPECTOR" || role === "INSPECTEUR_SIG") {
      redirectPath = "/dashboard"; // ou la route de l'inspecteur
    }

    // Connexion réussie, on retourne le succès et le chemin de redirection
    return NextResponse.json({ 
      success: true, 
      message: "Connexion réussie",
      redirect: redirectPath,
      user: { email, role } 
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message }, 
      { status: 500 }
    );
  }
}