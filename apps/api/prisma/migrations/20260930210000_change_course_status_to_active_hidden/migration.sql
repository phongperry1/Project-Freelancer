CREATE TYPE "CourseStatus_new" AS ENUM ('ACTIVE', 'HIDDEN');

ALTER TABLE "Course" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "Course" ALTER COLUMN "status" TYPE "CourseStatus_new"
  USING (
    CASE
      WHEN "status"::text = 'PUBLISHED' THEN 'ACTIVE'::"CourseStatus_new"
      WHEN "status"::text = 'ACTIVE' THEN 'ACTIVE'::"CourseStatus_new"
      ELSE 'HIDDEN'::"CourseStatus_new"
    END
  );

ALTER TABLE "Course" ALTER COLUMN "status" SET DEFAULT 'ACTIVE'::"CourseStatus_new";

DROP TYPE "CourseStatus";

ALTER TYPE "CourseStatus_new" RENAME TO "CourseStatus";
