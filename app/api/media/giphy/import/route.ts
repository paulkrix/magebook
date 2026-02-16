import { unlink } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { downloadGiphyById } from "@/lib/giphy";
import { prisma } from "@/lib/prisma";
import { getChatMediaFilePath, getMaxChatMediaBytes, saveChatMediaBuffer } from "@/lib/uploads";

function isValidGiphyId(value: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(value);
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiUser(request);
    if ("response" in auth) {
      return auth.response;
    }

    const body = (await request.json()) as { giphyId?: string };
    const giphyId = body.giphyId?.trim() ?? "";

    if (!isValidGiphyId(giphyId)) {
      return NextResponse.json({ error: "Invalid GIPHY id." }, { status: 400 });
    }

    const { bytes, suggestedName } = await downloadGiphyById(giphyId, getMaxChatMediaBytes());
    const savedMedia = await saveChatMediaBuffer(bytes, suggestedName);

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
    console.error("GIPHY import error:", error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Unable to import GIF." }, { status: 500 });
  }
}
