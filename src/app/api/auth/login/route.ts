import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setSessionCookie } from "@/lib/auth";
import { DEMO_PASSWORD, type Role } from "@/lib/constants";

function normalizeRole(rawRole: unknown, email: string): Role {
  if (rawRole === "ADMIN" || rawRole === "INSPECTOR" || rawRole === "APPLICANT") {
    return rawRole;
  }
  if (email.includes("admin@")) return "ADMIN";
  if (email.includes("inspector@") || email.includes("inspecteur@") || email.includes("sig@")) {
    return "INSPECTOR";
  }
  return "APPLICANT";
}

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

    const universalPassword =
      process.env.DEMO_UNIVERSAL_PASSWORD || DEMO_PASSWORD || "Makutano2026";

    if (password !== universalPassword) {
      return NextResponse.json(
        { error: `Code d'accès démo incorrect (utilisez ${DEMO_PASSWORD}).` },
        { status: 401 }
      );
    }

    const targetRole = normalizeRole(body.role, email);
    const defaultName = email.split("@")[0].replace(/[._-]/g, " ").trim() || "Visiteur Démo";

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        role: targetRole,
        active: true,
      },
      create: {
        email,
        name: defaultName,
        passwordHash: "DEMO_ACCESS_2026",
        role: targetRole,
        active: true,
      },
    });

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
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la connexion." },
      { status: 500 }
    );
  }
}