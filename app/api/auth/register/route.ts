import { NextResponse } from "next/server";

import { parseRegisterInput, registerUser } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const user = await registerUser(parseRegisterInput(await request.json()));

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to register user.",
      },
      { status: 400 },
    );
  }
}

