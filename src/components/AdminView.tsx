/**
 * Admin panel (role = admin only): users, activity log, support tickets, and
 * top-line metrics. Everything here goes through supabase-js and is enforced
 * by the database's RLS policies — the nav gate is just cosmetics.
 */
export function AdminView() {
  return (
    <div>
      <h2 className="mb-4 text-xl font-bold text-slate-800 dark:text-slate-100">Admin</h2>
      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 text-sm text-slate-500 dark:text-slate-400">
        Coming together in the next phase.
      </section>
    </div>
  )
}
