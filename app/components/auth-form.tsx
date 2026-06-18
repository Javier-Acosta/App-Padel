"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type AuthFormMode = "login" | "register";

type AuthFormProps = {
  mode: AuthFormMode;
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRegister = mode === "register";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "No pudimos completar la operación.");
      }

      router.push("/reservas");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No pudimos completar la operación.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      {isRegister ? (
        <>
          <label className="grid gap-1.5 text-sm font-medium text-[#26382f]">
            Nombre
            <input
              name="name"
              type="text"
              autoComplete="name"
              required
              className="h-11 rounded-md border border-[#cbd3c9] bg-white px-3 text-base outline-none transition focus:border-[#164b35] focus:ring-2 focus:ring-[#cfe3d8]"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-[#26382f]">
            Telefono
            <input
              name="phone"
              type="tel"
              autoComplete="tel"
              required
              className="h-11 rounded-md border border-[#cbd3c9] bg-white px-3 text-base outline-none transition focus:border-[#164b35] focus:ring-2 focus:ring-[#cfe3d8]"
            />
          </label>
        </>
      ) : null}

      <label className="grid gap-1.5 text-sm font-medium text-[#26382f]">
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="h-11 rounded-md border border-[#cbd3c9] bg-white px-3 text-base outline-none transition focus:border-[#164b35] focus:ring-2 focus:ring-[#cfe3d8]"
        />
      </label>

      <label className="grid gap-1.5 text-sm font-medium text-[#26382f]">
        Contraseña
        <input
          name="password"
          type="password"
          autoComplete={isRegister ? "new-password" : "current-password"}
          minLength={isRegister ? 8 : undefined}
          required
          className="h-11 rounded-md border border-[#cbd3c9] bg-white px-3 text-base outline-none transition focus:border-[#164b35] focus:ring-2 focus:ring-[#cfe3d8]"
        />
      </label>

      {error ? (
        <p className="rounded-md border border-[#e7b8a4] bg-[#fff3ee] px-3 py-2 text-sm text-[#7b3f28]">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-2 h-11 rounded-md bg-[#164b35] px-4 text-sm font-semibold text-white transition hover:bg-[#0f3827] disabled:cursor-not-allowed disabled:bg-[#8ca397]"
      >
        {isSubmitting
          ? "Procesando..."
          : isRegister
            ? "Crear cuenta"
            : "Ingresar"}
      </button>

      <p className="text-center text-sm text-[#526158]">
        {isRegister ? "Ya tenes cuenta?" : "Todavia no tenes cuenta?"}{" "}
        <Link
          href={isRegister ? "/login" : "/register"}
          className="font-semibold text-[#164b35] hover:underline"
        >
          {isRegister ? "Ingresar" : "Crear cuenta"}
        </Link>
      </p>
    </form>
  );
}

