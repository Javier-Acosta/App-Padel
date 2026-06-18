import { NextResponse } from "next/server";

import { loginUser, parseLoginInput } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const user = await loginUser(parseLoginInput(await request.json()));

    return NextResponse.json({ user });
  } catch {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 },
    );
  }
}
