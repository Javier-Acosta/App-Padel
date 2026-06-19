import { redirect } from "next/navigation";

import { AuthForm } from "@/app/components/auth-form";
import { AuthShell } from "@/app/components/auth-shell";
import { getCurrentUser } from "@/lib/auth/session";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect(user.role === "admin" ? "/admin" : "/reservas");
  }

  return (
    <AuthShell
      title="Ingresa para reservar tu cancha."
      subtitle="Usa tu cuenta para ver disponibilidad y continuar con el flujo de reserva."
    >
      <AuthForm mode="login" />
    </AuthShell>
  );
}

