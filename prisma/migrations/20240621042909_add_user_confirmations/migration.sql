-- AlterTable
ALTER TABLE "Matches" ADD COLUMN     "playerOneConfirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "playerTwoConfirmed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "scoreVisible" BOOLEAN NOT NULL DEFAULT false;
