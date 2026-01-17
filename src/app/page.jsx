import styles from "./page.module.css";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

const Home = async () => {
  const { userId } = auth();
  let href = userId ? "/home" : "/new-user";
  return (
    <main className={styles.container}>
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.badge}>TENNIS COMPETITION PLATFORM</div>
          <h1 className={styles.title}>
            <span className={styles.titleMain}>Baseline</span>
            <span className={styles.titleAccent}>The Court is Calling</span>
          </h1>
          <p className={styles.subtitle}>
            Challenge rivals. Track victories. Dominate the rankings.
          </p>
          <Link href={href}>
            <button className={styles.getStarted}>
              Start Playing
              <span className={styles.arrow}>→</span>
            </button>
          </Link>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <div className={styles.statNumber}>Live</div>
              <div className={styles.statLabel}>Rankings</div>
            </div>
            <div className={styles.statDivider}></div>
            <div className={styles.stat}>
              <div className={styles.statNumber}>Unlimited</div>
              <div className={styles.statLabel}>Challenges</div>
            </div>
            <div className={styles.statDivider}></div>
            <div className={styles.stat}>
              <div className={styles.statNumber}>Real</div>
              <div className={styles.statLabel}>Competition</div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.features}>
        <div className={styles.sectionHeader}>
          <h2>How It Works</h2>
          <p>Three simple steps to start competing</p>
        </div>
        <div className={styles.featuresGrid}>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>🎾</div>
            <h3>Issue Challenges</h3>
            <p>Call out any player and throw down the gauntlet. The court awaits your challenge.</p>
          </div>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>📊</div>
            <h3>Log Your Matches</h3>
            <p>Record every set, every game. Build an unbeatable track record of victories.</p>
          </div>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>🏆</div>
            <h3>Climb the Ladder</h3>
            <p>Earn points with every win. Rise through the ranks and claim your throne.</p>
          </div>
        </div>
      </div>

      <div className={styles.scoring}>
        <div className={styles.sectionHeader}>
          <h2>Points System</h2>
          <p>The more you risk, the more you gain</p>
        </div>
        <div className={styles.scoringGrid}>
          <div className={styles.scoringCard}>
            <div className={styles.scoringHeader}>
              <div className={styles.scoringBadge}>QUICK MATCH</div>
            </div>
            <div className={styles.points}>5<span>pts</span></div>
            <div className={styles.matchType}>Best of 1 Set</div>
            <div className={styles.scoringDesc}>Fast-paced action</div>
          </div>
          <div className={`${styles.scoringCard} ${styles.featured}`}>
            <div className={styles.scoringHeader}>
              <div className={styles.scoringBadge}>POPULAR</div>
            </div>
            <div className={styles.points}>10<span>pts</span></div>
            <div className={styles.matchType}>Best of 3 Sets</div>
            <div className={styles.scoringDesc}>Classic format</div>
          </div>
          <div className={styles.scoringCard}>
            <div className={styles.scoringHeader}>
              <div className={styles.scoringBadge}>CHAMPIONSHIP</div>
            </div>
            <div className={styles.points}>20<span>pts</span></div>
            <div className={styles.matchType}>Best of 5 Sets</div>
            <div className={styles.scoringDesc}>Ultimate test</div>
          </div>
        </div>
      </div>

      <div className={styles.cta}>
        <h2>Ready to Compete?</h2>
        <p>Join the community and start your journey to the top</p>
        <Link href={href}>
          <button className={styles.ctaButton}>Get Started Now</button>
        </Link>
      </div>
    </main>
  );
};

export default Home;
