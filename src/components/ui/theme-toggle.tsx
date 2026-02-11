"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export function ThemeToggle() {
  const { data: session, status } = useSession();
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [mounted, setMounted] = useState(false);
  const isLoggedIn = status === 'authenticated' && !!session;

  // Load theme preference from API or localStorage
  useEffect(() => {
    setMounted(true);

    const loadTheme = async () => {
      let savedTheme: 'light' | 'dark' | null = null;

      if (isLoggedIn && session?.user?.email) {
        // Try loading from API for logged-in users
        try {
          const response = await fetch('/api/user-preferences');
          if (response.ok) {
            const prefs = await response.json();
            if (prefs.theme && prefs.theme !== 'system') {
              savedTheme = prefs.theme;
            }
          }
        } catch (error) {
          console.error('[ThemeToggle] Failed to load theme from API:', error);
        }
      }

      // Fallback to localStorage if no API theme found
      if (!savedTheme) {
        savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
      }

      if (savedTheme) {
        setTheme(savedTheme);
        if (savedTheme === 'light') {
          document.documentElement.classList.add('light');
          document.documentElement.classList.remove('dark');
        } else {
          document.documentElement.classList.add('dark');
          document.documentElement.classList.remove('light');
        }
      } else {
        // Use system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const systemTheme = prefersDark ? 'dark' : 'light';
        setTheme(systemTheme);
        if (systemTheme === 'light') {
          document.documentElement.classList.add('light');
          document.documentElement.classList.remove('dark');
        } else {
          document.documentElement.classList.add('dark');
          document.documentElement.classList.remove('light');
        }
      }
    };

    loadTheme();
  }, [isLoggedIn, session?.user?.email]);

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      const savedTheme = localStorage.getItem('theme');
      // Only update if user hasn't set a manual preference
      if (!savedTheme) {
        const newTheme = e.matches ? 'dark' : 'light';
        setTheme(newTheme);
        if (newTheme === 'light') {
          document.documentElement.classList.add('light');
          document.documentElement.classList.remove('dark');
        } else {
          document.documentElement.classList.add('dark');
          document.documentElement.classList.remove('light');
        }
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);

    console.log('[ThemeToggle] Switching to:', newTheme);

    // Apply theme immediately
    if (newTheme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    }

    // Save to API or localStorage
    if (isLoggedIn && session?.user?.email) {
      try {
        await fetch('/api/user-preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ theme: newTheme })
        });
        console.log('[ThemeToggle] Saved theme to API:', newTheme);
      } catch (error) {
        console.error('[ThemeToggle] Failed to save theme to API:', error);
        // Fallback to localStorage
        localStorage.setItem('theme', newTheme);
      }
    } else {
      localStorage.setItem('theme', newTheme);
    }

    console.log('[ThemeToggle] HTML classes after toggle:', document.documentElement.className);
  };

  // Prevent flash during SSR
  if (!mounted) {
    return (
      <button
        className="h-10 px-3 py-2 rounded-md border border-border bg-card text-muted-foreground transition-colors"
        disabled
      >
        <div className="h-5 w-5" />
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="h-10 px-3 py-2 rounded-md border border-border bg-card hover:bg-accent text-foreground transition-colors"
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </button>
  );
}
