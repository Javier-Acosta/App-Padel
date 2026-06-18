import Link from "next/link";
import { ReactNode } from "react";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <main className="min-h-screen bg-[#f6f7f4] px-6 py-8 text-[#1b241f]">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl flex-col">
        <Link href="/" className="text-lg font-semibold">
          AppPadel
        </Link>
        <div className="grid flex-1 gap-10 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <section>
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-[#7b3f28]">
              Acceso al club
            </p>
            <h1 className="text-4xl font-semibold leading-tight">{title}</h1>
            <p className="mt-4 max-w-md text-lg leading-8 text-[#526158]">
              {subtitle}
            </p>
          </section>
          <section className="rounded-lg border border-[#d9ded5] bg-white p-6 shadow-sm sm:p-8">
            {children}
          </section>
        </div>
      </div>
    </main>
  );
}

