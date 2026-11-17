// Puts the fixed test fixtures back before each run (fictional seed data only; local database only).
import postgres from "postgres";
const ANA = "00000000-0000-4000-8000-00000000000a", BEN = "00000000-0000-4000-8000-00000000000b", CY = "00000000-0000-4000-8000-00000000000c";
/** Restore the fixed fixtures (called before each project's run, and once globally). */
export async function resetFixtures() {
  const db = postgres("postgresql://postgres:postgres@127.0.0.1:55322/postgres", { max: 1, onnotice: () => {} });
  try {
    await db`delete from public.matches where note like 'e2e%'`;
    await db`update public.matches set status = 'pending', responded_at = null, confirmed_at = null where id = '00000000-0000-4000-8000-0000000000f1'`;
    await db`delete from public.challenges where challenger in (${ANA}, ${BEN}, ${CY}) and opponent in (${ANA}, ${BEN}, ${CY})`;
    await db`insert into public.challenges (challenger, opponent, format, message) values (${CY}, ${ANA}, 3, 'Rematch. Saturday morning?')`;
    await db`delete from public.rate_limits`;
    await db`delete from public.auth_rate_limits`;
    await db`update public.players set avatar_path = null`;
    await db`delete from storage.objects where bucket_id = 'avatars'`.catch(() => {});
    await db`update public.invites set used_by = null, used_at = null where code_hash = encode(extensions.digest('TESTINVITE23', 'sha256'), 'hex')`;
    await db`delete from public.players where auth_user_id = '10000000-0000-4000-8000-0000000000ff'`; // newbie
    await db`update public.players set auth_user_id = null where id = '00000000-0000-4000-8000-00000000000f'`; // Fay: unlinked again
  } finally { await db.end(); }
}

export default resetFixtures;

/** Email + password test accounts (fictional addresses on a reserved test domain): remove them and renew their invite. */
export async function resetEmailAccounts() {
  const db = postgres("postgresql://postgres:postgres@127.0.0.1:55322/postgres", { max: 1, onnotice: () => {} });
  try {
    await db`delete from public.players where auth_user_id in (select id from auth.users where email like '%@mail.e2e.test')`;
    await db`delete from auth.users where email like '%@mail.e2e.test'`;
    await db`delete from public.invites where code_hash = encode(extensions.digest('EMAILINVITE1', 'sha256'), 'hex')`;
    await db`insert into public.invites (code_hash, created_by) values (encode(extensions.digest('EMAILINVITE1', 'sha256'), 'hex'), ${ANA})`;
  } finally { await db.end(); }
}
