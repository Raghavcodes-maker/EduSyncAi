import { useState } from 'react';
import { AppProvider, useApp } from '@/context/AppContext';
import Onboarding from '@/components/Onboarding';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import Dashboard from '@/components/views/Dashboard';
import Subjects from '@/components/views/Subjects';
import StudyPlanner from '@/components/views/StudyPlanner';
import ResearchAgent from '@/components/views/ResearchAgent';
import SyllabusTrackerView from '@/components/views/SyllabusTrackerView';
import PracticeQuizView from '@/components/views/PracticeQuizView';
import WhatIfSimulator from '@/components/views/WhatIfSimulator';
import AIAssistant from '@/components/views/AIAssistant';
import Profile from '@/components/views/Profile';
import FixMyWeek from '@/components/FixMyWeek';
import type { ViewKey } from '@/types';

function AppContent() {
  const { profile, completeOnboarding } = useApp();
  const [view, setView] = useState<ViewKey>('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [fixOpen, setFixOpen] = useState(false);

  // Show onboarding if no profile or not onboarded
  if (!profile || !profile.onboarded) {
    return <Onboarding onComplete={completeOnboarding} />;
  }

  return (
    <div className="flex min-h-screen bg-[#0a0c14]">
      <Sidebar
        current={view}
        onNavigate={setView}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          current={view}
          onToggleMobile={() => setMobileOpen(true)}
          onFixMyWeek={() => setFixOpen(true)}
        />
        <main className="flex-1 p-4 sm:p-6 overflow-x-hidden">
          {view === 'dashboard' && (
            <Dashboard onNavigate={setView} onFixMyWeek={() => setFixOpen(true)} />
          )}
          {view === 'syllabus' && <SyllabusTrackerView onNavigate={setView} />}
          {view === 'quiz' && <PracticeQuizView onNavigate={setView} />}
          {view === 'subjects' && <Subjects />}
          {view === 'planner' && <StudyPlanner />}
          {view === 'research' && <ResearchAgent onNavigate={setView} />}
          {view === 'simulator' && <WhatIfSimulator />}
          {view === 'assistant' && <AIAssistant />}
          {view === 'profile' && <Profile onResetOnboarding={() => setView('dashboard')} />}
        </main>
      </div>
      <FixMyWeek open={fixOpen} onClose={() => setFixOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
