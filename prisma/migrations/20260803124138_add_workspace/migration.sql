-- CreateEnum
CREATE TYPE "Workspace" AS ENUM ('JOB', 'PERSONAL');

-- DropIndex
DROP INDEX "Task_weekStart_status_idx";

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "workspace" "Workspace" NOT NULL DEFAULT 'JOB';

-- CreateIndex
CREATE INDEX "Task_workspace_weekStart_status_idx" ON "Task"("workspace", "weekStart", "status");
