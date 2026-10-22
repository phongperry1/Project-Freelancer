-- AlterTable
ALTER TABLE "Course" ADD COLUMN "grade" VARCHAR(50) NOT NULL DEFAULT '10';

-- CreateIndex
CREATE INDEX "Course_grade_idx" ON "Course"("grade");
