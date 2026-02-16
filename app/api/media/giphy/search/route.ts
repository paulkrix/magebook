import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { searchGiphy } from "@/lib/giphy";

function normalizeQuery(raw: string | null): string {
  return (raw ?? "").trim().slice(0, 100);
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireApiUser(request);
    if ("response" in auth) {
      return auth.response;
    }

    const query = normalizeQuery(request.nextUrl.searchParams.get("q"));
    if (query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const results = await searchGiphy(query);
    return NextResponse.json({ results });
  } catch (error) {
    console.error("GIPHY search error:", error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Unable to search GIFs." }, { status: 500 });
  }
}
