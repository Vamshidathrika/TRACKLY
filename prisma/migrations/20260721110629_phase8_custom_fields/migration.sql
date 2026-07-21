-- CreateTable
CREATE TABLE "CustomField" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL DEFAULT 'STRING',
    "required" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomField_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CustomField" ADD CONSTRAINT "CustomField_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
