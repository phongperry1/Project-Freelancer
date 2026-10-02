DROP INDEX IF EXISTS "Course_grade_idx";

ALTER TABLE "Course" DROP COLUMN IF EXISTS "grade";
