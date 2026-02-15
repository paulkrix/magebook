import { NextRequest, NextResponse } from "next/server";
import {
  getProfileImageMimeTypeFromFilename,
  isSafeProfileImageFilename,
  readProfileImageFile
} from "@/lib/uploads";

type Context = {
  params: {
    filename: string;
  };
};

export async function GET(_request: NextRequest, context: Context) {
  const { filename } = context.params;

  if (!isSafeProfileImageFilename(filename)) {
    return NextResponse.json({ error: "Invalid filename." }, { status: 400 });
  }

  try {
    const imageBuffer = await readProfileImageFile(filename);
    const contentType = getProfileImageMimeTypeFromFilename(filename);
    const imageBytes = new Uint8Array(imageBuffer);

    return new NextResponse(imageBytes, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    });
  } catch {
    return NextResponse.json({ error: "Image not found." }, { status: 404 });
  }
}
