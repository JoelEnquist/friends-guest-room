-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'GUEST');
CREATE TYPE "BookingStatus" AS ENUM ('NEEDS_APPROVAL', 'APPROVED', 'DENIED', 'CANCELLED');
CREATE TYPE "CleaningPlan" AS ENUM ('SELF_CLEAN', 'PAY_VENMO_OR_CASH');
CREATE TYPE "BookingSource" AS ENUM ('GUEST_REQUEST', 'ADMIN_MANUAL');
CREATE TYPE "BlackoutSource" AS ENUM ('LOCAL', 'GOOGLE');
CREATE TYPE "InviteRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED');
CREATE TYPE "SuggestionCategory" AS ENUM (
  'SUPPLIES_RESTOCK',
  'LAYOUT_COMFORT',
  'INSTRUCTIONS_GUIDEBOOK',
  'CLEANING_TURNOVER',
  'SAFETY_SECURITY',
  'OTHER'
);
CREATE TYPE "SuggestionOwnerEffort" AS ENUM (
  'ZERO_MIN',
  'LT_5_MIN',
  'MIN_5_TO_15',
  'MIN_15_TO_60',
  'GT_60_MIN'
);
CREATE TYPE "SuggestionStatus" AS ENUM ('NEW', 'REVIEWING', 'ACCEPTED', 'DONE', 'DECLINED');

-- CreateTable
CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "name" TEXT,
  "email" TEXT NOT NULL,
  "emailVerified" TIMESTAMP(3),
  "image" TEXT,
  "role" "Role" NOT NULL DEFAULT 'GUEST',
  "allowed" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Booking" (
  "id" TEXT NOT NULL,
  "guestEmail" TEXT NOT NULL,
  "guestName" TEXT NOT NULL,
  "guestUserId" TEXT,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "status" "BookingStatus" NOT NULL DEFAULT 'NEEDS_APPROVAL',
  "cleaningPlan" "CleaningPlan" NOT NULL,
  "note" TEXT,
  "phone" TEXT,
  "adminMessage" TEXT,
  "source" "BookingSource" NOT NULL DEFAULT 'GUEST_REQUEST',
  "googleEventId" TEXT,
  "reminderSentAt" TIMESTAMP(3),
  "arrivalEmailSentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Blackout" (
  "id" TEXT NOT NULL,
  "title" TEXT,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "source" "BlackoutSource" NOT NULL DEFAULT 'LOCAL',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Blackout_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Settings" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "propertyDoorCodeEnc" TEXT,
  "guestRoomDoorCodeEnc" TEXT,
  "lastDoorCodeRotationAt" TIMESTAMP(3),
  "wifiName" TEXT,
  "wifiPassword" TEXT,
  "arrivalInstructions" TEXT,
  "guidebookText" TEXT,
  "nearbyRecommendations" TEXT,
  "polycamLink" TEXT,
  "photosJson" TEXT,
  "venmoHandle" TEXT,
  "paymentInstructions" TEXT,
  "checkoutChecklist" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "actorEmail" TEXT,
  "actionType" TEXT NOT NULL,
  "payload" TEXT,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InviteRequest" (
  "id" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "socialProfileUrl" TEXT NOT NULL,
  "mutualContact" TEXT NOT NULL,
  "tripPurpose" TEXT NOT NULL,
  "requestedStartDate" TIMESTAMP(3) NOT NULL,
  "requestedEndDate" TIMESTAMP(3) NOT NULL,
  "status" "InviteRequestStatus" NOT NULL DEFAULT 'PENDING',
  "reviewedAt" TIMESTAMP(3),
  "reviewedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InviteRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Suggestion" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "relatedBookingId" TEXT,
  "title" TEXT NOT NULL,
  "idea" TEXT NOT NULL,
  "category" "SuggestionCategory" NOT NULL,
  "sustainabilityPlan" TEXT NOT NULL,
  "ownerEffort" "SuggestionOwnerEffort" NOT NULL,
  "estimatedCost" TEXT,
  "productUrl" TEXT,
  "status" "SuggestionStatus" NOT NULL DEFAULT 'NEW',
  "adminNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Suggestion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Account" (
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "refresh_token" TEXT,
  "access_token" TEXT,
  "expires_at" INTEGER,
  "token_type" TEXT,
  "scope" TEXT,
  "id_token" TEXT,
  "session_state" TEXT,
  CONSTRAINT "Account_pkey" PRIMARY KEY ("provider", "providerAccountId")
);

CREATE TABLE "Session" (
  "sessionToken" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("sessionToken")
);

CREATE TABLE "VerificationToken" (
  "identifier" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expires" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier", "token")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_allowed_idx" ON "User"("allowed");
CREATE INDEX "Booking_guestEmail_idx" ON "Booking"("guestEmail");
CREATE INDEX "Booking_status_idx" ON "Booking"("status");
CREATE INDEX "Booking_startDate_endDate_idx" ON "Booking"("startDate", "endDate");
CREATE INDEX "Blackout_startDate_endDate_idx" ON "Blackout"("startDate", "endDate");
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");
CREATE INDEX "AuditLog_actionType_idx" ON "AuditLog"("actionType");
CREATE INDEX "InviteRequest_status_idx" ON "InviteRequest"("status");
CREATE INDEX "InviteRequest_email_idx" ON "InviteRequest"("email");
CREATE INDEX "InviteRequest_createdAt_idx" ON "InviteRequest"("createdAt");
CREATE INDEX "Suggestion_userId_createdAt_idx" ON "Suggestion"("userId", "createdAt");
CREATE INDEX "Suggestion_status_category_idx" ON "Suggestion"("status", "category");
CREATE INDEX "Suggestion_category_idx" ON "Suggestion"("category");
CREATE INDEX "Suggestion_relatedBookingId_idx" ON "Suggestion"("relatedBookingId");
CREATE INDEX "Suggestion_createdAt_idx" ON "Suggestion"("createdAt");
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- AddForeignKey
ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_guestUserId_fkey"
  FOREIGN KEY ("guestUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InviteRequest"
  ADD CONSTRAINT "InviteRequest_reviewedByUserId_fkey"
  FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Suggestion"
  ADD CONSTRAINT "Suggestion_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Suggestion"
  ADD CONSTRAINT "Suggestion_relatedBookingId_fkey"
  FOREIGN KEY ("relatedBookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Account"
  ADD CONSTRAINT "Account_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Session"
  ADD CONSTRAINT "Session_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
