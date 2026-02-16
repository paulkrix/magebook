import { unlink } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { getChatMediaFilePath, saveChatMediaFile } from "@/lib/uploads";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiUser(request);
    if ("response" in auth) {
      return auth.response;
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Media file is required." }, { status: 400 });
    }

    const savedMedia = await saveChatMediaFile(file);

    try {
      const media = await prisma.media.create({
        data: {
          uploaderId: auth.user.id,
          filename: savedMedia.filename,
          originalName: savedMedia.originalName ?? null,
          contentType: savedMedia.contentType,
          sizeBytes: savedMedia.sizeBytes,
          width: savedMedia.width ?? null,
          height: savedMedia.height ?? null
        },
        select: {
          id: true,
          contentType: true,
          width: true,
          height: true,
          originalName: true
        }
      });

      return NextResponse.json(
        {
          mediaId: media.id,
          contentType: media.contentType,
          width: media.width ?? undefined,
          height: media.height ?? undefined,
          originalName: media.originalName ?? undefined
        },
        { status: 201 }
      );
    } catch (error) {
      await unlink(getChatMediaFilePath(savedMedia.filename)).catch(() => undefined);
      throw error;
    }
  } catch (error) {
    console.error("Chat media upload error:", error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
