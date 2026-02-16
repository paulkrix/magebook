import { z } from "zod";

const profileImagePathSchema = z
  .string()
  .trim()
  .max(2048)
  .refine((value) => /^\/uploads\/profile-images\/[a-zA-Z0-9._-]+$/.test(value), {
    message: "Profile image path is invalid."
  });

export const loginSchema = z.object({
  identifier: z.string().trim().min(3).max(100),
  password: z.string().min(1).max(200)
});

export const profilePatchSchema = z
  .object({
    displayName: z.string().trim().min(1).max(80).optional(),
    bio: z.string().trim().max(280).optional(),
    profileImageUrl: profileImagePathSchema.optional()
  })
  .refine((payload) => payload.displayName !== undefined || payload.bio !== undefined || payload.profileImageUrl !== undefined, {
    message: "At least one profile field must be provided."
  });

export const createConversationSchema = z.object({
  title: z.string().trim().min(1).max(120),
  participantIds: z.array(z.string().min(1)).min(1)
});

export const renameConversationSchema = z.object({
  title: z.string().trim().min(1).max(120)
});

const messageTextSchema = z.object({
  type: z.literal("text").optional(),
  body: z.string().trim().min(1).max(2000)
});

const messageMediaSchema = z.object({
  type: z.literal("media"),
  mediaId: z.string().trim().min(1),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
  width: z.number().int().min(1).max(20_000).optional(),
  height: z.number().int().min(1).max(20_000).optional(),
  caption: z.string().trim().max(2000).optional()
});

export const createMessageSchema = z.union([messageTextSchema, messageMediaSchema]);

export const upsertMessageReactionSchema = z.object({
  emoji: z.string().trim().min(1).max(16)
});

export const inviteParticipantSchema = z.object({
  userId: z.string().trim().min(1)
});

export const adminCreateUserSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,24}$/),
  email: z.string().trim().toLowerCase().email().max(320).optional().or(z.literal("")),
  displayName: z.string().trim().min(1).max(80)
});

export const adminUserSocialCountsPatchSchema = z.object({
  followers: z.number().int().min(0).max(100000000),
  following: z.number().int().min(0).max(100000000)
});
