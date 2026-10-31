-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "budgetOverrides" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "suppressedTaskIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "customized" BOOLEAN NOT NULL DEFAULT false;
