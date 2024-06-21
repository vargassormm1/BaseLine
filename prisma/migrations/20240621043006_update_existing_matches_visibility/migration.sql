-- This is an empty migration.
UPDATE "Matches"
SET
  "scoreVisible" = true,
  "playerOneConfirmed" = true,
  "playerTwoConfirmed" = true
WHERE
  "scoreVisible" = false OR
  "playerOneConfirmed" = false OR
  "playerTwoConfirmed" = false;
