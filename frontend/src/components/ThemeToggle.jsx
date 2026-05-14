import { MoonStar, SunMedium } from 'lucide-react';

export default function ThemeToggle({ theme, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="glass-card flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition hover:scale-[1.02]"
    >
      {theme === 'dark' ? <SunMedium size={16} /> : <MoonStar size={16} />}
      {theme === 'dark' ? 'Light mode' : 'Dark mode'}
    </button>
  );
}
