ALTER TABLE "ConversationParticipant"
ADD COLUMN "lastReadAt" TIMESTAMP(3),
ADD COLUMN "unreadMessageCount" INTEGER NOT NULL DEFAULT 0;
