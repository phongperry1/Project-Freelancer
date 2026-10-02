ALTER TABLE "Course" ADD COLUMN "slug" VARCHAR(255);
ALTER TABLE "Course" ADD COLUMN "grade" VARCHAR(50);

CREATE UNIQUE INDEX "Course_slug_key" ON "Course"("slug");
CREATE INDEX "Course_grade_idx" ON "Course"("grade");
