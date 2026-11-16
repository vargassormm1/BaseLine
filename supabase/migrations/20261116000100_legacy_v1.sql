-- Verbatim copies of the V1 (Neon/Prisma) tables, kept forever for traceability. Same columns and types as V1.
-- Filled once by scripts/migrate-from-v1.mjs (read-only on the V1 side). Never exposed to the API.
create schema if not exists legacy;
revoke all on schema legacy from public;

create table legacy."User" (
  "userId" integer primary key, "clerkId" text not null, fname text not null, lname text not null, username text not null,
  email text not null, "imageUrl" text, "totalWins" integer not null, "totalLosses" integer not null, "totalPoints" integer not null
);
create table legacy."Matches" (
  "matchId" integer primary key, "playerOne" integer not null, "playerTwo" integer not null, "playerOneUsername" text,
  "playerTwoUsername" text, "matchType" integer not null, "winnerId" integer, "loserId" integer,
  "playedAt" timestamp(3) without time zone not null, "playerOneConfirmed" boolean not null, "playerTwoConfirmed" boolean not null,
  "scoreVisible" boolean not null
);
create table legacy."MatchDetails" (
  "detailId" integer primary key, "matchId" integer not null, "setNumber" integer not null, "playerOneScore" integer not null,
  "playerTwoScore" integer not null, "playerOneTieBreakerScore" integer, "playerTwoTieBreakerScore" integer
);
create table legacy."MessageThread" (
  "threadId" integer primary key, participant1 integer not null, participant2 integer not null,
  "lastUpdated" timestamp(3) without time zone not null
);
create table legacy."Message" (
  "messageId" integer primary key, "threadId" integer not null, "senderId" integer not null, "receiverId" integer not null,
  content text not null, "timestamp" timestamp(3) without time zone not null, read boolean not null
);
create table legacy._prisma_migrations (
  id character varying(36) primary key, checksum character varying(64) not null, finished_at timestamp with time zone,
  migration_name character varying(255) not null, logs text, rolled_back_at timestamp with time zone,
  started_at timestamp with time zone not null, applied_steps_count integer not null
);
-- one row per migration run: what was copied (fingerprints of both sides) and the reconciliation report
create table legacy.import_runs (
  id bigint generated always as identity primary key, finished_at timestamptz not null default now(),
  source_fingerprint jsonb not null, target_fingerprint jsonb not null, report jsonb not null
);
revoke all on all tables in schema legacy from public, anon, authenticated;
alter default privileges in schema legacy revoke all on tables from public, anon, authenticated;
