'use client'

import * as React from 'react'
import { Moon, Sun } from 'lucide-react'
import { useThemeContext } from '@/context/ThemeContext'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { theme, setTheme } = useThemeContext()

  // Consider anything other than clean-light as a 'dark' mode variant for the toggle state
  const isDark = theme !== 'clean-light'

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(isDark ? 'clean-light' : 'midnight-obsidian')}
      className="h-9 w-9 rounded-full border-border-subtle bg-surface text-text-muted hover:text-text hover:bg-surface-muted transition-colors"
      title="Toggle Daylight/Night Light"
    >
      <Sun className={`h-[1.2rem] w-[1.2rem] transition-all ${isDark ? '-rotate-90 scale-0' : 'rotate-0 scale-100'}`} />
      <Moon className={`absolute h-[1.2rem] w-[1.2rem] transition-all ${isDark ? 'rotate-0 scale-100' : 'rotate-90 scale-0'}`} />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
