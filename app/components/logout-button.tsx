"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogout() {
    setIsSubmitting(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isSubmitting}
      className="rounded-md border border-[#c8d0c7] bg-white px-4 py-2 text-sm font-semibold text-[#26382f] transition hover:border-[#8ea090] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isSubmitting ? "Saliendo..." : "Salir"}
    </button>
  );
}

