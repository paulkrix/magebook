import { randomBytes } from "crypto";
import { mkdir, readFile, stat, writeFile } from "fs/promises";
import path from "path";

const DEFAULT_UPLOAD_BASE_DIR = "/data/uploads";
const PROFILE_IMAGE_DIR_NAME = "profile-images";
const CHAT_MEDIA_DIR_NAME = "chat-media";
const DEFAULT_MAX_PROFILE_IMAGE_BYTES = 2 * 1024 * 1024;
const DEFAULT_MAX_CHAT_MEDIA_BYTES = 20 * 1024 * 1024;

const ALLOWED_IMAGE_MIME_TYPES = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"]
]);
const JPEG_START_OF_FRAME_MARKERS = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);

export type SavedChatMedia = {
  filename: string;
  originalName?: string;
  contentType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
};

function parseMaxProfileImageBytes(raw: string | undefined): number {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    return DEFAULT_MAX_PROFILE_IMAGE_BYTES;
  }

  return Math.floor(value);
}

function parseMaxChatMediaBytes(raw: string | undefined): number {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    return DEFAULT_MAX_CHAT_MEDIA_BYTES;
  }

  return Math.floor(value);
}

export function getMaxProfileImageBytes(): number {
  return parseMaxProfileImageBytes(process.env.MAX_PROFILE_IMAGE_BYTES);
}

export function getMaxChatMediaBytes(): number {
  return parseMaxChatMediaBytes(process.env.MAX_CHAT_MEDIA_BYTES);
}

export function getProfileImageUploadDir(): string {
  const uploadBaseDir = process.env.UPLOAD_BASE_DIR?.trim() || DEFAULT_UPLOAD_BASE_DIR;
  return path.join(uploadBaseDir, PROFILE_IMAGE_DIR_NAME);
}

export function getChatMediaUploadDir(): string {
  const uploadBaseDir = process.env.UPLOAD_BASE_DIR?.trim() || DEFAULT_UPLOAD_BASE_DIR;
  return path.join(uploadBaseDir, CHAT_MEDIA_DIR_NAME);
}

export function isAllowedProfileImageMimeType(mimeType: string): boolean {
  return ALLOWED_IMAGE_MIME_TYPES.has(mimeType);
}

export function isAllowedChatMediaMimeType(mimeType: string): boolean {
  return ALLOWED_IMAGE_MIME_TYPES.has(mimeType);
}

function extensionForMimeType(mimeType: string): string {
  return ALLOWED_IMAGE_MIME_TYPES.get(mimeType) ?? "bin";
}

export function buildProfileImagePublicPath(filename: string): string {
  return `/uploads/profile-images/${filename}`;
}

export function isSafeProfileImageFilename(filename: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(filename);
}

export function getProfileImageMimeTypeFromFilename(filename: string): string {
  if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (filename.endsWith(".png")) {
    return "image/png";
  }
  if (filename.endsWith(".webp")) {
    return "image/webp";
  }
  if (filename.endsWith(".gif")) {
    return "image/gif";
  }

  return "application/octet-stream";
}

export function getProfileImageFilePath(filename: string): string {
  return path.join(getProfileImageUploadDir(), filename);
}

export function isSafeChatMediaFilename(filename: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(filename);
}

export function getChatMediaFilePath(filename: string): string {
  return path.join(getChatMediaUploadDir(), filename);
}

function detectImageMimeType(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }

  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }

  if (
    buffer.length >= 6 &&
    (buffer.toString("ascii", 0, 6) === "GIF87a" || buffer.toString("ascii", 0, 6) === "GIF89a")
  ) {
    return "image/gif";
  }

  return null;
}

function getPngDimensions(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 24) {
    return null;
  }

  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);

  if (width <= 0 || height <= 0) {
    return null;
  }

  return { width, height };
}

function getGifDimensions(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 10) {
    return null;
  }

  const width = buffer.readUInt16LE(6);
  const height = buffer.readUInt16LE(8);

  if (width <= 0 || height <= 0) {
    return null;
  }

  return { width, height };
}

function getJpegDimensions(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return null;
  }

  let offset = 2;

  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    let marker = buffer[offset + 1];
    offset += 2;

    while (marker === 0xff && offset < buffer.length) {
      marker = buffer[offset];
      offset += 1;
    }

    if (marker === 0xd8 || marker === 0x01) {
      continue;
    }

    if (marker === 0xd9 || marker === 0xda) {
      break;
    }

    if (offset + 1 >= buffer.length) {
      break;
    }

    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > buffer.length) {
      break;
    }

    if (JPEG_START_OF_FRAME_MARKERS.has(marker) && segmentLength >= 7) {
      const height = buffer.readUInt16BE(offset + 3);
      const width = buffer.readUInt16BE(offset + 5);

      if (width > 0 && height > 0) {
        return { width, height };
      }
    }

    offset += segmentLength;
  }

  return null;
}

function getWebpDimensions(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 30) {
    return null;
  }

  const chunkType = buffer.toString("ascii", 12, 16);

  if (chunkType === "VP8X") {
    const width = buffer.readUIntLE(24, 3) + 1;
    const height = buffer.readUIntLE(27, 3) + 1;

    if (width > 0 && height > 0) {
      return { width, height };
    }

    return null;
  }

  if (chunkType === "VP8 ") {
    const frameHeaderStart = 20;

    if (buffer.length < frameHeaderStart + 10) {
      return null;
    }

    if (buffer[frameHeaderStart + 3] !== 0x9d || buffer[frameHeaderStart + 4] !== 0x01 || buffer[frameHeaderStart + 5] !== 0x2a) {
      return null;
    }

    const width = buffer.readUInt16LE(frameHeaderStart + 6) & 0x3fff;
    const height = buffer.readUInt16LE(frameHeaderStart + 8) & 0x3fff;

    if (width > 0 && height > 0) {
      return { width, height };
    }

    return null;
  }

  if (chunkType === "VP8L") {
    const frameStart = 20;

    if (buffer.length < frameStart + 5 || buffer[frameStart] !== 0x2f) {
      return null;
    }

    const b1 = buffer[frameStart + 1];
    const b2 = buffer[frameStart + 2];
    const b3 = buffer[frameStart + 3];
    const b4 = buffer[frameStart + 4];
    const width = 1 + (b1 | ((b2 & 0x3f) << 8));
    const height = 1 + ((b2 >> 6) | (b3 << 2) | ((b4 & 0x0f) << 10));

    if (width > 0 && height > 0) {
      return { width, height };
    }
  }

  return null;
}

function detectImageDimensions(buffer: Buffer, contentType: string): { width: number; height: number } | null {
  if (contentType === "image/png") {
    return getPngDimensions(buffer);
  }
  if (contentType === "image/gif") {
    return getGifDimensions(buffer);
  }
  if (contentType === "image/jpeg") {
    return getJpegDimensions(buffer);
  }
  if (contentType === "image/webp") {
    return getWebpDimensions(buffer);
  }

  return null;
}

function sanitizeOriginalName(rawName: string): string | undefined {
  const basename = rawName.split(/[\\/]/).at(-1) ?? "";
  const asciiOnly = basename.replace(/[^\x20-\x7E]/g, "");
  const sanitized = asciiOnly.replace(/[^a-zA-Z0-9._ -]/g, "_").replace(/\s+/g, " ").trim().slice(0, 120);

  return sanitized || undefined;
}

export async function saveProfileImageFile(file: File): Promise<string> {
  const contentType = file.type;
  if (!isAllowedProfileImageMimeType(contentType)) {
    throw new Error("Only JPEG, PNG, WEBP, and GIF images are supported.");
  }

  const maxBytes = getMaxProfileImageBytes();
  if (file.size > maxBytes) {
    throw new Error(`Image is too large. Maximum allowed size is ${maxBytes} bytes.`);
  }

  const extension = extensionForMimeType(contentType);
  const filename = `${Date.now()}-${randomBytes(8).toString("hex")}.${extension}`;
  const uploadDir = getProfileImageUploadDir();

  await mkdir(uploadDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, filename), buffer);

  return filename;
}

export async function readProfileImageFile(filename: string): Promise<Buffer> {
  return readFile(getProfileImageFilePath(filename));
}

async function persistChatMediaBuffer(fileBuffer: Buffer, originalName?: string): Promise<SavedChatMedia> {
  const maxBytes = getMaxChatMediaBytes();
  if (fileBuffer.length <= 0) {
    throw new Error("Uploaded media file cannot be empty.");
  }
  if (fileBuffer.length > maxBytes) {
    throw new Error(`Media file is too large. Maximum allowed size is ${maxBytes} bytes.`);
  }

  const detectedMimeType = detectImageMimeType(fileBuffer);
  if (!detectedMimeType || !isAllowedChatMediaMimeType(detectedMimeType)) {
    throw new Error("Only JPEG, PNG, WEBP, and GIF files are supported.");
  }

  const extension = extensionForMimeType(detectedMimeType);
  const filename = `${Date.now()}-${randomBytes(8).toString("hex")}.${extension}`;
  const uploadDir = getChatMediaUploadDir();

  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), fileBuffer);

  const dimensions = detectImageDimensions(fileBuffer, detectedMimeType);

  return {
    filename,
    originalName: originalName ? sanitizeOriginalName(originalName) : undefined,
    contentType: detectedMimeType,
    sizeBytes: fileBuffer.length,
    width: dimensions?.width,
    height: dimensions?.height
  };
}

export async function saveChatMediaFile(file: File): Promise<SavedChatMedia> {
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  return persistChatMediaBuffer(fileBuffer, file.name);
}

export async function saveChatMediaBuffer(buffer: Buffer, originalName?: string): Promise<SavedChatMedia> {
  return persistChatMediaBuffer(buffer, originalName);
}

export async function readChatMediaFile(filename: string): Promise<Buffer> {
  return readFile(getChatMediaFilePath(filename));
}

export async function statChatMediaFile(filename: string) {
  return stat(getChatMediaFilePath(filename));
}
