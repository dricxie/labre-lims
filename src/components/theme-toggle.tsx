'use client';

import { Moon, Sun } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { useTheme } from '@/components/theme-provider';

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur',
        className,
      )}
    >
      <Sun className={cn('h-4 w-4', isDark ? 'text-muted-foreground/70' : 'text-primary')} />
      <Switch
        aria-label="Toggle dark mode"
        checked={isDark}
        onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
        className="data-[state=checked]:bg-primary"
      />
      <Moon className={cn('h-4 w-4', isDark ? 'text-primary' : 'text-muted-foreground/70')} />
    </div>
  );
}
