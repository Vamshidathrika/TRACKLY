-- CreateEnum
CREATE TYPE "AutomationTrigger" AS ENUM ('ISSUE_CREATED', 'STATUS_CHANGED', 'COMMENT_ADDED');

-- CreateEnum
CREATE TYPE "AutomationAction" AS ENUM ('ASSIGN_USER', 'UPDATE_STATUS', 'ADD_COMMENT');

-- CreateTable
CREATE TABLE "AutomationRule" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "eventTrigger" "AutomationTrigger" NOT NULL,
    "action" "AutomationAction" NOT NULL,
    "targetValue" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationRule_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AutomationRule" ADD CONSTRAINT "AutomationRule_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
