import type { ViewKey } from '@/types';
import {
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  Search,
  SlidersHorizontal,
  MessageSquare,
  BrainCircuit,
  UserCircle,
  ListChecks,
  Sparkles,
} from 'lucide-react';
import { useApp, getProfileSubtitle, getProfileInitials } from '@/context/AppContext';

interface SidebarProps {
  current: ViewKey;
  onNavigate: (v: ViewKey) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const navItems: { key: ViewKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'syllabus', label: 'Syllabus Tracker', icon: ListChecks },
  { key: 'quiz', label: 'Practice Quiz', icon: Sparkles },
  { key: 'research', label: 'Research Agent', icon: Search },
  { key: 'planner', label: 'Study Planner', icon: CalendarDays },
  { key: 'subjects', label: 'Subjects', icon: BookOpen },
  { key: 'simulator', label: 'What-If Simulator', icon: SlidersHorizontal },
  { key: 'assistant', label: 'AI Assistant', icon: MessageSquare },
  { key: 'profile', label: 'Profile', icon: UserCircle },
];

export default function Sidebar({ current, onNavigate, mobileOpen, onCloseMobile }: SidebarProps) {
  const { profile } = useApp();

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden animate-fadeIn"
          onClick={onCloseMobile}
        />
      )}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 flex flex-col glass-strong border-r border-white/8 transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center gap-3 px-6 py-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-cyan-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <BrainCircuit size={22} className="text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-white text-lg leading-tight">
              EduSync AI
            </h1>
            <p className="text-[10px] text-slate-400 tracking-wide">
              ACADEMIC DIGITAL TWIN
            </p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const active = current === item.key;
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => {
                  onNavigate(item.key);
                  onCloseMobile();
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-sky-500/15 text-sky-400 border border-sky-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon size={18} className={active ? 'text-sky-400' : 'text-slate-500'} />
                {item.label}
                {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sky-400" />}
              </button>
            );
          })}
        </nav>

        {profile && (
          <div className="px-4 py-4 border-t border-white/8">
            <button
              onClick={() => {
                onNavigate('profile');
                onCloseMobile();
              }}
              className="card-surface rounded-xl p-3 w-full text-left hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-400 to-sky-500 flex items-center justify-center text-white text-sm font-semibold">
                  {getProfileInitials(profile)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{profile.name}</p>
                  <p className="text-[11px] text-slate-400 truncate">{getProfileSubtitle(profile)}</p>
                </div>
              </div>
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
