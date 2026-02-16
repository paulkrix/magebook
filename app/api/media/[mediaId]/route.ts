import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { isSafeChatMediaFilename, readChatMediaFile, statChatMediaFile } from "@/lib/uploads";

type Context = {
  params: {
    mediaId: string;
  };
};

function buildEtag(mediaId: string, sizeBytes: number, mtimeMs: number): string {
  const hash = createHash("sha1").update(`${mediaId}:${sizeBytes}:${mtimeMs}`).digest("hex");
  return `"${hash}"`;
}

export async function GET(request: NextRequest, context: Context) {
  try {
    const auth = await requireApiUser(request);
    if ("response" in auth) {
      return auth.response;
    }

    const media = await prisma.media.findUnique({
      where: { id: context.params.mediaId },
      select: {
        id: true,
        filename: true,
        contentType: true
      }
    });

    if (!media || !isSafeChatMediaFilename(media.filename)) {
      return NextResponse.json({ error: "Media not found." }, { status: 404 });
    }

    const [mediaBuffer, mediaStats] = await Promise.all([readChatMediaFile(media.filename), statChatMediaFile(media.filename)]);
    const etag = buildEtag(media.id, mediaStats.size, mediaStats.mtimeMs);
    const lastModified = mediaStats.mtime.toUTCString();
    const sharedHeaders = new Headers({
      "Cache-Control": "private, max-age=3600",
      ETag: etag,
      "Last-Modified": lastModified,
      Vary: "Cookie"
    });

    const ifNoneMatch = request.headers.get("if-none-match");
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304, headers: sharedHeaders });
    }

    const ifModifiedSince = request.headers.get("if-modified-since");
    if (ifModifiedSince) {
      const modifiedSince = new Date(ifModifiedSince);
      if (!Number.isNaN(modifiedSince.getTime()) && mediaStats.mtime.getTime() <= modifiedSince.getTime()) {
        return new NextResponse(null, { status: 304, headers: sharedHeaders });
      }
    }

    sharedHeaders.set("Content-Type", media.contentType);

    return new NextResponse(new Uint8Array(mediaBuffer), {
      status: 200,
      headers: sharedHeaders
    });
  } catch (error) {
    console.error("Chat media fetch error:", error);
    return NextResponse.json({ error: "Media not found." }, { status: 404 });
  }
}
