-- DropIndex
DROP INDEX IF EXISTS "Course_slug_key";

-- AlterTable
ALTER TABLE "Course" DROP COLUMN IF EXISTS "slug";
