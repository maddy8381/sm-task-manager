-- DropIndex
DROP INDEX "Task_day_idx";

-- DropIndex
DROP INDEX "Task_workspace_weekStart_status_idx";

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "userId" TEXT;

-- CreateIndex
CREATE INDEX "Task_userId_workspace_weekStart_status_idx" ON "Task"("userId", "workspace", "weekStart", "status");

-- CreateIndex
CREATE INDEX "Task_userId_day_idx" ON "Task"("userId", "day");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
