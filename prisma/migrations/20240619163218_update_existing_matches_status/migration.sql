-- This is an empty migration.
UPDATE "Matches"
SET
  "playerOneConfirmed" = true,
  "playerTwoConfirmed" = true
WHERE
  "playerOneConfirmed" = false OR
  "playerTwoConfirmed" = false;