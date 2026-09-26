-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DELETED');

-- CreateEnum
CREATE TYPE "BookStatus" AS ENUM ('TO_READ', 'READING', 'READ', 'PAUSED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "MoodTag" AS ENUM ('MOVED', 'CALM', 'JOYFUL', 'SAD', 'ANGRY', 'CONFUSED', 'RELIEVED', 'EMPTY', 'CHANGED');

-- CreateEnum
CREATE TYPE "ActivityEntityType" AS ENUM ('BOOK', 'DOG_EAR', 'ANNOTATION', 'REREAD_MARK', 'COMPLETION_REFLECTION');

-- CreateEnum
CREATE TYPE "ActivityAction" AS ENUM ('CREATED', 'UPDATED', 'DELETED', 'RESTORED', 'STATUS_CHANGED', 'COMPLETED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(3),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "books" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "title" VARCHAR(300) NOT NULL,
    "author" VARCHAR(300),
    "publisher" VARCHAR(300),
    "publication_year" SMALLINT,
    "isbn" VARCHAR(20),
    "page_count" INTEGER,
    "cover_url" TEXT,
    "status" "BookStatus" NOT NULL DEFAULT 'TO_READ',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dog_ears" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "book_id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "page_number" INTEGER NOT NULL,
    "reason" VARCHAR(500),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "dog_ears_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "annotations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "book_id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "start_page" INTEGER NOT NULL,
    "end_page" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "annotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reread_marks" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "book_id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "page_number" INTEGER NOT NULL,
    "reason" VARCHAR(1000),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "reread_marks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "completion_reflections" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "book_id" UUID NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "completion_round" INTEGER NOT NULL,
    "mood_tags" "MoodTag"[],
    "reflection" TEXT,
    "completed_at" TIMESTAMPTZ(3) NOT NULL,
    "editable_until" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "completion_reflections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_events" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "book_id" UUID,
    "entity_type" "ActivityEntityType" NOT NULL,
    "entity_id" UUID,
    "action" "ActivityAction" NOT NULL,
    "payload_json" JSONB NOT NULL DEFAULT '{}',
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_expires_at_idx" ON "sessions"("user_id", "expires_at");

-- CreateIndex
CREATE INDEX "books_user_id_deleted_at_updated_at_idx" ON "books"("user_id", "deleted_at", "updated_at");

-- CreateIndex
CREATE INDEX "books_user_id_status_idx" ON "books"("user_id", "status");

-- CreateIndex
CREATE INDEX "books_user_id_title_idx" ON "books"("user_id", "title");

-- CreateIndex
CREATE INDEX "dog_ears_user_id_deleted_at_created_at_idx" ON "dog_ears"("user_id", "deleted_at", "created_at");

-- CreateIndex
CREATE INDEX "dog_ears_book_id_page_number_deleted_at_idx" ON "dog_ears"("book_id", "page_number", "deleted_at");

-- CreateIndex
CREATE INDEX "annotations_user_id_deleted_at_created_at_idx" ON "annotations"("user_id", "deleted_at", "created_at");

-- CreateIndex
CREATE INDEX "annotations_book_id_start_page_end_page_deleted_at_idx" ON "annotations"("book_id", "start_page", "end_page", "deleted_at");

-- CreateIndex
CREATE INDEX "reread_marks_user_id_deleted_at_created_at_idx" ON "reread_marks"("user_id", "deleted_at", "created_at");

-- CreateIndex
CREATE INDEX "reread_marks_book_id_page_number_deleted_at_idx" ON "reread_marks"("book_id", "page_number", "deleted_at");

-- CreateIndex
CREATE INDEX "completion_reflections_user_id_deleted_at_completed_at_idx" ON "completion_reflections"("user_id", "deleted_at", "completed_at");

-- CreateIndex
CREATE INDEX "completion_reflections_book_id_completion_round_deleted_at_idx" ON "completion_reflections"("book_id", "completion_round", "deleted_at");

-- CreateIndex
CREATE INDEX "activity_events_user_id_occurred_at_idx" ON "activity_events"("user_id", "occurred_at");

-- CreateIndex
CREATE INDEX "activity_events_user_id_book_id_occurred_at_idx" ON "activity_events"("user_id", "book_id", "occurred_at");

-- CreateIndex
CREATE INDEX "activity_events_user_id_entity_type_occurred_at_idx" ON "activity_events"("user_id", "entity_type", "occurred_at");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "books" ADD CONSTRAINT "books_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dog_ears" ADD CONSTRAINT "dog_ears_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dog_ears" ADD CONSTRAINT "dog_ears_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "annotations" ADD CONSTRAINT "annotations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "annotations" ADD CONSTRAINT "annotations_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reread_marks" ADD CONSTRAINT "reread_marks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reread_marks" ADD CONSTRAINT "reread_marks_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "completion_reflections" ADD CONSTRAINT "completion_reflections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "completion_reflections" ADD CONSTRAINT "completion_reflections_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Enforce business uniqueness only for active rows.
CREATE UNIQUE INDEX "dog_ears_book_page_active_key"
  ON "dog_ears"("book_id", "page_number")
  WHERE "deleted_at" IS NULL;

CREATE UNIQUE INDEX "completion_reflections_book_round_active_key"
  ON "completion_reflections"("book_id", "completion_round")
  WHERE "deleted_at" IS NULL;
