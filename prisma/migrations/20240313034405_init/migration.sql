-- CreateTable
CREATE TABLE "User" (
    "userId" SERIAL NOT NULL,
    "clerkId" TEXT NOT NULL,
    "fname" TEXT NOT NULL,
    "lname" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "totalWins" INTEGER NOT NULL DEFAULT 0,
    "totalLosses" INTEGER NOT NULL DEFAULT 0,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "User_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Matches" (
    "matchId" SERIAL NOT NULL,
    "playerOne" INTEGER NOT NULL,
    "playerTwo" INTEGER NOT NULL,
    "matchType" INTEGER NOT NULL,
    "winnerId" INTEGER,
    "playedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Matches_pkey" PRIMARY KEY ("matchId")
);

-- CreateTable
CREATE TABLE "MatchDetails" (
    "detailId" SERIAL NOT NULL,
    "matchId" INTEGER NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "playerOneScore" INTEGER NOT NULL,
    "playerTwoScore" INTEGER NOT NULL,
    "playerOneTieBreakerScore" INTEGER,
    "playerTwoTieBreakerScore" INTEGER,

    CONSTRAINT "MatchDetails_pkey" PRIMARY KEY ("detailId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Matches" ADD CONSTRAINT "Matches_playerOne_fkey" FOREIGN KEY ("playerOne") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matches" ADD CONSTRAINT "Matches_playerTwo_fkey" FOREIGN KEY ("playerTwo") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matches" ADD CONSTRAINT "Matches_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchDetails" ADD CONSTRAINT "MatchDetails_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Matches"("matchId") ON DELETE RESTRICT ON UPDATE CASCADE;
