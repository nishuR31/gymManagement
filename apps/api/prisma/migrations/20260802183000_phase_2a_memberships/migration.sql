-- CreateEnum
CREATE TYPE "MembershipSubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'FROZEN', 'CANCELLED');

-- CreateTable
CREATE TABLE "MembershipPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "ptIncluded" BOOLEAN NOT NULL DEFAULT false,
    "lockerIncluded" BOOLEAN NOT NULL DEFAULT false,
    "guestPassesIncluded" INTEGER NOT NULL DEFAULT 0,
    "accessTiming" TEXT,
    "gracePeriodDays" INTEGER NOT NULL DEFAULT 0,
    "freezeAllowed" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipSubscription" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "MembershipSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "freezeStartDate" TIMESTAMP(3),
    "freezeEndDate" TIMESTAMP(3),
    "priceAtPurchaseCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MembershipPlan_isActive_idx" ON "MembershipPlan"("isActive");

-- CreateIndex
CREATE INDEX "MembershipSubscription_memberId_startDate_idx" ON "MembershipSubscription"("memberId", "startDate");

-- CreateIndex
CREATE INDEX "MembershipSubscription_planId_idx" ON "MembershipSubscription"("planId");

-- CreateIndex
CREATE INDEX "MembershipSubscription_status_idx" ON "MembershipSubscription"("status");

-- CreateIndex
CREATE UNIQUE INDEX membership_one_active_subscription_per_member
ON "MembershipSubscription" ("memberId")
WHERE "status" = 'ACTIVE';

-- AddForeignKey
ALTER TABLE "MembershipSubscription" ADD CONSTRAINT "MembershipSubscription_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipSubscription" ADD CONSTRAINT "MembershipSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MembershipPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
