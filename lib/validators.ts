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

export const createMessageSchema = z.object({
  body: z.string().trim().min(1).max(2000)
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
