import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { buildProfileImagePublicPath, saveProfileImageFile } from "@/lib/uploads";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiUser(request);
    if ("response" in auth) {
      return auth.response;
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Profile image file is required." }, { status: 400 });
    }

    const filename = await saveProfileImageFile(file);
    return NextResponse.json({ publicUrl: buildProfileImagePublicPath(filename) }, { status: 201 });
  } catch (error) {
    console.error("Profile image upload error:", error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
