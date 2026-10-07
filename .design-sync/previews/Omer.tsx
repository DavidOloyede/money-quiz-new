import { Omer } from 'money-quiz'

const POSES = ['idle', 'wave', 'cheer', 'jump', 'thinking', 'oops', 'proud', 'giving'] as const
const OUTFITS = ['hero', 'detective', 'coach', 'chef', 'wrangler', 'builder', 'gardener', 'graduate', 'dreamer'] as const

// The eight poses, base Omer (no costume). `still` so a static capture shows them at rest.
export function Poses() {
  return (
    <div className="flex max-w-2xl flex-wrap gap-4">
      {POSES.map((pose) => (
        <figure key={pose} className="flex flex-col items-center gap-1">
          <Omer pose={pose} size={96} motion="still" />
          <figcaption className="font-rounded text-xs font-bold text-linen-500">{pose}</figcaption>
        </figure>
      ))}
    </div>
  )
}

// The wardrobe: one costume per kind of moment. Each is drawn in its own pose.
export function Wardrobe() {
  return (
    <div className="flex max-w-2xl flex-wrap gap-4">
      {OUTFITS.map((outfit) => (
        <figure key={outfit} className="flex flex-col items-center gap-1">
          <Omer outfit={outfit} size={96} motion="still" />
          <figcaption className="font-rounded text-xs font-bold text-linen-500">{outfit}</figcaption>
        </figure>
      ))}
    </div>
  )
}

// Below 64px an outfit gives way to plain Omer in his pose: the same props at 48 and 96.
export function SmallSizes() {
  return (
    <div className="flex items-end gap-4">
      <Omer outfit="coach" pose="cheer" size={48} motion="still" />
      <Omer outfit="coach" pose="cheer" size={96} motion="still" />
    </div>
  )
}

// At a moment: the quiz is finished, so the Graduate cheers beside the verdict.
export function AtAMoment() {
  return (
    <div className="card flex max-w-md items-center gap-4 p-5">
      <Omer outfit="graduate" pose="cheer" size={96} motion="still" />
      <div>
        <h3 className="font-rounded text-lg font-extrabold text-linen-900 dark:text-linen-50">Quiz complete!</h3>
        <p className="mt-1 text-sm text-linen-500 dark:text-linen-400">8 of 10 right. You know your money well.</p>
      </div>
    </div>
  )
}
