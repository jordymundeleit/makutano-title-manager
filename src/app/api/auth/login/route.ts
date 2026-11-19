import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setSessionCookie } from "@/lib/auth";
import { DEMO_PASSWORD, type Role } from "@/lib/constants";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "").trim();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Veuillez renseigner votre adresse e-mail et le code d'accès." },
        { status: 400 }
      );
    }

    const UNIVERSAL_PASSWORD = process.env.DEMO_UNIVERSAL_PASSWORD || DEMO_PASSWORD || "Makutano2026";

    if (password !== UNIVERSAL_PASSWORD) {
      return NextResponse.json(
        { error: "Code d'accès démo incorrect (utilisez Makutano2026)." },
        { status: 401 }
      );
    }

    // Détermination du rôle selon le compte utilisé (démonstration ou prospect LinkedIn)
    let targetRole: Role = "APPLICANT";
    if (email.includes("admin@")) {
      targetRole = "ADMIN";
    } else if (email.includes("inspector@") || email.includes("sig@")) {
      targetRole = "INSPECTOR";
    }

    const defaultName = email.split("@")[0].replace(/[._-]/g, " ");

    // Création automatique du lead ou récupération de son compte dans Neon PostgreSQL
    const user = await prisma.user.upsert({
      where: { email },
      update: { active: true },
      create: {
        email,
        name: defaultName || "Visiteur Démo",
        passwordHash: "DEMO_ACCESS_2026",
        role: targetRole,
        active: true,
      },
    });

    // Enregistrement du lead dans le journal d'audit (AuditLog)
    try {
      await prisma.auditLog.create({
        data: {
          actorId: user.id,
          action: "DEMO_LOGIN_LINKEDIN",
          targetType: "User",
          targetId: user.id,
          details: `Connexion démo via ${email} (${user.role})`,
        },
      });
    } catch {
      // On n'empêche pas la connexion si le log échoue
    }

    // Génération et écriture du cookie de session JWT "mt_session"
    await setSessionCookie({
      uid: user.id,
      role: user.role as Role,
      name: user.name,
    });

    const redirectPath =
      user.role === "ADMIN" || user.role === "INSPECTOR" ? "/admin" : "/applicant";

    return NextResponse.json({
      success: true,
      redirect: redirectPath,
      user: { email: user.email, role: user.role },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la connexion." },
      { status: 500 }
    );
  }
}