import Link from "next/link";
import { requirePlayer } from "@/lib/server/session";
import { loadBoard } from "@/lib/server/data";
import { Rail, TabBar, Wordmark } from "@/components/shell/Nav";
import { attentionCount } from "@/lib/ui/inbox";
import { Toaster } from "@/components/ui/Toast";
import { cookies } from "next/headers";
import { loadPickleball } from "@/lib/server/pickleball";
import { pbAttention } from "@/lib/pickleball/inbox";
import { isSport, SPORT_COOKIE } from "@/lib/sports";
import { SportSwitcher } from "@/components/shell/SportSwitcher";

/** Signed-in frame: rail on desktop, tab bar on phones. Every page inside also calls requirePlayer(). */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const s = await requirePlayer();
  const [board, pb, jar] = await Promise.all([loadBoard(s.sb), loadPickleball(s.sb).catch(() => null), cookies()]);
  const me = board.byId.get(s.me);
  const c = jar.get(SPORT_COOKIE)?.value;
  const sport = isSport(c) ? c : "tennis";
  // the badge counts what's waiting for me in every sport (the layout loads once, not on each tab switch)
  const nav = { meHref: me ? `/players/${me.username}` : "/settings", attention: attentionCount(board, s.me) + (pb ? pbAttention(pb, s.me) : 0), sport };
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line px-4 pt-6 pb-5 lg:flex" aria-label="Sidebar">
        <Link href="/start" className="mb-7 px-2" aria-label="Baseline home"><Wordmark /></Link>
        <Rail {...nav} />
      </aside>
      <main id="main" className="pt-safe pb-tabbar mx-auto w-full max-w-[1040px] px-4 sm:px-6 lg:pb-16 lg:pt-8">
        <div className="flex justify-center pt-3 pb-1 lg:justify-start lg:pt-0 lg:pb-4"><SportSwitcher fallback={sport} /></div>
        {children}
      </main>
      <TabBar {...nav} />
      <Toaster />
    </div>
  );
}
