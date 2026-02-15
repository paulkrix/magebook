import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  void request;
  return NextResponse.json(
    { error: "This endpoint is deprecated. Use POST /api/me/profile-image with multipart form data." },
    { status: 410 }
  );
}
