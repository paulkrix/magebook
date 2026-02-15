import { randomBytes } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

const DEFAULT_UPLOAD_BASE_DIR = "/data/uploads";
const PROFILE_IMAGE_DIR_NAME = "profile-images";
const DEFAULT_MAX_PROFILE_IMAGE_BYTES = 2 * 1024 * 1024;

const ALLOWED_IMAGE_MIME_TYPES = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/gif", "gif"]
]);

function parseMaxProfileImageBytes(raw: string | undefined): number {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    return DEFAULT_MAX_PROFILE_IMAGE_BYTES;
  }

  return Math.floor(value);
}

export function getMaxProfileImageBytes(): number {
  return parseMaxProfileImageBytes(process.env.MAX_PROFILE_IMAGE_BYTES);
}

export function getProfileImageUploadDir(): string {
  const uploadBaseDir = process.env.UPLOAD_BASE_DIR?.trim() || DEFAULT_UPLOAD_BASE_DIR;
  return path.join(uploadBaseDir, PROFILE_IMAGE_DIR_NAME);
}

export function isAllowedProfileImageMimeType(mimeType: string): boolean {
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
