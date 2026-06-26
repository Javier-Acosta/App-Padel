import { NextResponse } from "next/server";

import {
  AuthInputError,
  parseRegisterInput,
  registerUser,
} from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const user = await registerUser(parseRegisterInput(await request.json()));

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof AuthInputError) {
      return NextResponse.json(
        { error: "Revisá los datos ingresados e intentá nuevamente." },
        { status: 400 },
      );
    }

    if (
      error instanceof Error &&
      error.message.startsWith("Missing required environment variables:")
    ) {
      return NextResponse.json(
        { error: "El servicio de autenticacion no esta configurado." },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: "No pudimos crear la cuenta. Intenta nuevamente mas tarde." },
      { status: 502 },
    );
  }
}

