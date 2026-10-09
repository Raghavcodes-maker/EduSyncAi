import type { ViewKey } from '@/types';
import { Menu, Wand2, Bell } from 'lucide-react';
import { useApp, getProfileInitials } from '@/context/AppContext';

interface TopBarProps {
  current: ViewKey;
  onToggleMobile: () => void;
  onFixMyWeek: () => void;
}

const titles: Record<ViewKey, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Your academic command center' },
  subjects: { title: 'Subjects', subtitle: 'Manage your courses and track preparation' },
  planner: { title: 'Study Planner', subtitle: 'Your adaptive study schedule' },
  research: { title: 'Research Agent', subtitle: 'Evidence-based study resource discovery' },
  simulator: { title: 'What-If Simulator', subtitle: 'Explore how changes affect your readiness' },
  assistant: { title: 'AI Assistant', subtitle: 'Your personal academic planning assistant' },
  profile: { title: 'Profile', subtitle: 'Manage your academic profile' },
};

export default function TopBar({ current, onToggleMobile, onFixMyWeek }: TopBarProps) {
  const { profile } = useApp();
  const t = titles[current];
  return (
    <header className="sticky top-0 z-20 glass border-b border-white/6 px-4 sm:px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onToggleMobile}
            className="lg:hidden p-2 rounded-lg text-slate-300 hover:bg-white/10 transition-colors"
          >
            <Menu size={20} />
          </button>
          <div className="min-w-0">
            <h2 className="font-display font-bold text-xl text-white truncate">{t.title}</h2>
            <p className="text-xs text-slate-400 truncate hidden sm:block">{t.subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {current === 'dashboard' && (
            <button
              onClick={onFixMyWeek}
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 transition-all active:scale-95 shadow-lg shadow-sky-500/25"
            >
              <Wand2 size={16} />
              Fix My Week
            </button>
          )}
          {current !== 'dashboard' && current !== 'profile' && (
            <button
              onClick={onFixMyWeek}
              className="inline-flex sm:hidden items-center justify-center w-10 h-10 rounded-xl text-white bg-gradient-to-r from-sky-500 to-cyan-500 transition-all active:scale-95"
            >
              <Wand2 size={16} />
            </button>
          )}
          <button className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors relative">
            <Bell size={18} />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-sky-400" />
          </button>
          {profile && (
            <div className="hidden sm:flex items-center gap-2.5 pl-3 border-l border-white/10">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-400 to-sky-500 flex items-center justify-center text-white text-sm font-semibold">
                {getProfileInitials(profile)}
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-white leading-tight">
                  {profile.name}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
