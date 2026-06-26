import { redirect } from "next/navigation";

import { AuthForm } from "@/app/components/auth-form";
import { AuthShell } from "@/app/components/auth-shell";
import { getCurrentUser } from "@/lib/auth/session";

export default async function RegisterPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/reservas");
  }

  return (
    <AuthShell
      title="Crea tu cuenta de jugador."
      subtitle="Necesitamos tus datos básicos para asociar reservas y avisos del club."
    >
      <AuthForm mode="register" />
    </AuthShell>
  );
}

