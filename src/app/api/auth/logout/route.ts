import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (email) {
      await resend.emails.send({
        from: 'Makutano Mining <onboarding@resend.dev>',
        to: email,
        subject: 'Merci d’avoir consulté Makutano Mining !',
        html: `
          <div style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
            <h2>Merci d'avoir testé Makutano Mining !</h2>
            <p>Nous espérons que cette démonstration de la digitalisation des titres miniers vous a inspiré.</p>
            <p>💡 <strong>Un petit mot de la part de l'équipe :</strong> Si cette solution vous a plu, merci de laisser un like et de partager la publication sur LinkedIn pour soutenir l'évolution de la digitalisation de nos structures institutionnelles en RDC !</p>
            <br>
            <p>À très bientôt,</p>
            <p><strong>L'équipe Mosfab & Makutano Mining</strong></p>
          </div>
        `
      });
    }

    return NextResponse.json({ success: true, message: "Déconnexion et e-mail envoyés." });
  } catch (error: any) {
    console.error("Erreur e-mail déconnexion:", error);
    return NextResponse.json({ success: true, message: "Déconnexion effectuée." });
  }
}