/**
 * The landing page's light/dark switch: a small sun and moon pair in the top
 * bar. It sets the same saved theme as the app's own switch in the menu, so
 * the choice carries into the app after sign-up.
 */
import { useStore } from '@moneyquiz/core/store'
import { MoonIcon, SunIcon } from '../icons'

export function ThemeSwitch() {
  const { theme, setTheme } = useStore()
  const options = [
    { mode: 'light', label: 'Light mode', Icon: SunIcon },
    { mode: 'dark', label: 'Dark mode', Icon: MoonIcon },
  ] as const
  return (
    <div
      role="group"
      aria-label="Colour theme"
      className="flex items-center rounded-full bg-linen-900/[0.05] p-1 dark:bg-linen-50/[0.07]"
    >
      {options.map(({ mode, label, Icon }) => {
        const on = theme === mode
        return (
          <button
            key={mode}
            type="button"
            onClick={() => setTheme(mode)}
            aria-label={label}
            aria-pressed={on}
            title={label}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-forest-600 ${
              on
                ? 'bg-cream text-honey-700 shadow-sm dark:bg-linen-800 dark:text-honey-300'
                : 'text-linen-500 hover:text-linen-900 dark:text-linen-400 dark:hover:text-linen-100'
            }`}
          >
            <Icon className="h-[18px] w-[18px]" />
          </button>
        )
      })}
    </div>
  )
}
