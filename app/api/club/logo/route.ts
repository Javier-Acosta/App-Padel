import { NextResponse } from "next/server";

import { getPublicClubSettings } from "@/lib/padel/data";

export async function GET() {
  const settings = await getPublicClubSettings();

  if (!settings?.logoUrl) {
    return new NextResponse(null, { status: 404 });
  }

  const response = await fetch(settings.logoUrl, { cache: "no-store" });

  if (!response.ok || !response.body) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(response.body, {
    headers: {
      "Cache-Control": "public, max-age=300",
      "Content-Type":
        response.headers.get("Content-Type") ?? "application/octet-stream",
    },
  });
}
