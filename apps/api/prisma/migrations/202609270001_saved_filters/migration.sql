-- CreateTable
CREATE TABLE "saved_filters" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "search" VARCHAR(200) NOT NULL DEFAULT '',
    "status" "BookStatus",
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "saved_filters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "saved_filters_user_id_created_at_idx" ON "saved_filters"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "saved_filters_user_id_name_key" ON "saved_filters"("user_id", "name");

-- AddForeignKey
ALTER TABLE "saved_filters" ADD CONSTRAINT "saved_filters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

