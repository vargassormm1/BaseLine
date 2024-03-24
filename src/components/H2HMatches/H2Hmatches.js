import Match from "../Match/Match";
import styles from "./H2Hmatches.module.css";

const H2HMatches = ({ matches }) => {
  return (
    <div>
      {matches?.length !== 0 ? (
        matches?.map((match) => {
          return <Match key={match.matchId} matchData={match} />;
        })
      ) : (
        <></>
      )}
    </div>
  );
};
export default H2HMatches;
