'use client'

import * as React from 'react'
import { Moon, Sun, Monitor, Code, Palette, Zap } from 'lucide-react'
import { useThemeContext, Theme } from '@/context/ThemeContext'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'

const themes: { value: Theme; label: string; icon: React.FC<any> }[] = [
  { value: 'midnight-obsidian', label: 'Midnight Obsidian', icon: Moon },
  { value: 'vscode-dark', label: 'VS Code Dark', icon: Code },
  { value: 'cyberpunk-neon', label: 'Cyberpunk Neon', icon: Zap },
  { value: 'tokyo-night', label: 'Tokyo Night', icon: Monitor },
  { value: 'clean-light', label: 'Clean Light', icon: Sun },
]

export function ThemeSwitcher() {
  const { theme, setTheme } = useThemeContext()
  
  // To avoid hydration mismatch if server and client differ, 
  // though the blocking script in head matches it, we still only render
  // the current theme icon once mounted if necessary, but standard is fine.
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const ActiveIcon = themes.find(t => t.value === theme)?.icon || Palette

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="w-9 h-9 rounded-full focus-ring">
          {mounted ? <ActiveIcon className="w-4 h-4 text-text-muted" /> : <Palette className="w-4 h-4 text-text-muted" />}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>IDE Themes</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {themes.map((t) => (
          <DropdownMenuItem 
            key={t.value} 
            onClick={() => setTheme(t.value)}
            className={theme === t.value ? 'bg-surface-strong text-text' : 'text-text-muted'}
          >
            <t.icon className="w-4 h-4 mr-2" />
            {t.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
