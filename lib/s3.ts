export async function createProfileImageUploadUrl(
  _userId: string,
  _contentType: string
): Promise<{ uploadUrl: string; publicUrl: string }> {
  throw new Error("Deprecated upload helper. Use POST /api/me/profile-image instead.");
}
