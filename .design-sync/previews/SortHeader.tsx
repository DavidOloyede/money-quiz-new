import { SortHeader } from 'money-quiz'

// The canonical use: column headers in a transactions table. The active column
// ("Date" here) shows its sort arrow; the arrow slot is reserved on the others
// so toggling never shifts the layout.
export function TableHeader() {
  return (
    <div className="max-w-2xl overflow-hidden rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-500">
          <tr className="border-b border-slate-200">
            <th className="px-4 py-2.5 text-left">
              <SortHeader sortKey="date" label="Date" current="date" asc={false} onToggle={() => {}} />
            </th>
            <th className="px-4 py-2.5 text-left">
              <SortHeader sortKey="description" label="Description" current="date" asc={false} onToggle={() => {}} />
            </th>
            <th className="px-4 py-2.5 text-left">
              <SortHeader sortKey="category" label="Category" current="date" asc={false} onToggle={() => {}} />
            </th>
            <th className="px-4 py-2.5 text-right">
              <SortHeader sortKey="amount" label="Amount" current="date" asc={false} align="right" onToggle={() => {}} />
            </th>
          </tr>
        </thead>
        <tbody className="text-slate-700">
          <tr className="border-b border-slate-100">
            <td className="px-4 py-2.5 tabular-nums">Jun 14</td>
            <td className="px-4 py-2.5">Whole Foods Market</td>
            <td className="px-4 py-2.5">Groceries</td>
            <td className="px-4 py-2.5 text-right tabular-nums">−$84.20</td>
          </tr>
          <tr>
            <td className="px-4 py-2.5 tabular-nums">Jun 13</td>
            <td className="px-4 py-2.5">Payroll deposit</td>
            <td className="px-4 py-2.5">Income</td>
            <td className="px-4 py-2.5 text-right tabular-nums text-emerald-600">+$2,400.00</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// The three states side by side: active-ascending, inactive (arrow slot
// reserved, invisible), and non-sortable static text.
export function States() {
  return (
    <div className="flex items-center gap-8 rounded-xl border border-slate-200 bg-white px-6 py-4 text-sm text-slate-500">
      <SortHeader sortKey="amount" label="Amount ↑ active" current="amount" asc onToggle={() => {}} />
      <SortHeader sortKey="date" label="Inactive" current="amount" asc={false} onToggle={() => {}} />
      <SortHeader sortKey="id" label="Not sortable" current="amount" asc={false} sortable={false} onToggle={() => {}} />
    </div>
  )
}
