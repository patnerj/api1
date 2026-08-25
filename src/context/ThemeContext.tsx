'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

export type Theme = 'midnight-obsidian' | 'vscode-dark' | 'cyberpunk-neon' | 'tokyo-night' | 'clean-light'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeContextProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('midnight-obsidian')

  useEffect(() => {
    // Read initial theme from localStorage on mount
    try {
      const storedTheme = localStorage.getItem('user-theme') as Theme
      if (storedTheme) {
        setThemeState(storedTheme)
        document.documentElement.setAttribute('data-theme', storedTheme)
      } else {
        document.documentElement.setAttribute('data-theme', 'midnight-obsidian')
      }
    } catch (e) {}
  }, [])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    try {
      localStorage.setItem('user-theme', newTheme)
      document.documentElement.setAttribute('data-theme', newTheme)
    } catch (e) {}
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useThemeContext() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeContextProvider')
  }
  return context
}
