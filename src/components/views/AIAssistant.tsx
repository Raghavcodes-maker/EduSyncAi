import { useState, useRef, useEffect } from 'react';
import {
  Send,
  BrainCircuit,
  Sparkles,
  Clock,
  CalendarClock,
  AlertCircle,
  User,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import { useApp } from '@/context/AppContext';
import type { ChatMessage } from '@/types';

const quickPrompts = [
  { icon: Clock, text: "I have 2 hours today. What should I study?", color: '#38bdf8' },
  { icon: CalendarClock, text: "My Physics exam is in 5 days.", color: '#fbbf24' },
  { icon: AlertCircle, text: "I missed yesterday's study plan.", color: '#f87171' },
];

function generateResponse(input: string, subjects: { name: string; preparation: number; pendingTopics: string[]; examDate: string; status: string }[]): string {
  const lower = input.toLowerCase();

  if (lower.includes('2 hours') || lower.includes('two hours') || lower.includes('what should i study')) {
    const critical = subjects.filter((s) => s.status === 'Critical' || s.preparation < 60);
    const target = critical[0] ?? subjects[0];
    if (!target) return "I'd recommend starting with your most urgent subject. Could you tell me which subjects you're currently studying?";
    const topic = target.pendingTopics[0] ?? 'a core topic';
    return `With 2 hours today, I'd recommend focusing on **${target.name}** — specifically **${topic}**.\n\nYour ${target.name} preparation is at ${target.preparation}%, which is your most urgent area. Spend the first 30 minutes reviewing concepts, then dedicate 75 minutes to active problem-solving. Save the last 15 minutes for a quick recap.\n\nThis single session could boost your ${target.name} readiness by approximately 4-5%.`;
  }

  if (lower.includes('physics') && (lower.includes('5 days') || lower.includes('exam'))) {
    return `Your Physics exam is in 5 days. Here's my recommended plan:\n\n**Day 1-2:** Quantum Mechanics — focus on the Schrödinger equation and practice problems (2h each day)\n**Day 3:** Wave Optics — interference, diffraction patterns (1.5h)\n**Day 4:** Thermodynamics + Nuclear Physics review (2h)\n**Day 5:** Full review + past exam questions (2.5h)\n\nAt your current 62% preparation, this plan should bring you to approximately **85% readiness** by exam day. The key is consistent daily practice — don't skip sessions.\n\nWould you like me to add these sessions to your Study Planner?`;
  }

  if (lower.includes('missed') || lower.includes('yesterday') || lower.includes('skipped')) {
    return `No worries — missing a day happens. Let's get you back on track.\n\nYour missed session was likely a Mathematics or Physics block. I recommend:\n\n1. **Don't try to double up today** — that leads to burnout\n2. **Prioritize the missed topic** in your next available slot\n3. **Shorten the session slightly** (45 min instead of 60) to ease back in\n4. **Use Fix My Week** to auto-reschedule remaining sessions\n\nYour overall academic health won't drop significantly from one missed day. Consistency over the remaining week matters more than a single gap.`;
  }

  if (lower.includes('help') || lower.includes('what can you do')) {
    return `I'm EduSync AI, your academic digital twin. Here's how I can help:\n\n• **Study planning** — Tell me your available time and I'll recommend what to study\n• **Exam preparation** — Get day-by-day plans for upcoming exams\n• **Priority guidance** — I'll tell you which subject needs attention most\n• **Recovery plans** — Missed a session? I'll help you get back on track\n• **What-if analysis** — Ask about different scenarios and I'll project outcomes\n\nWhat would you like to work on?`;
  }

  if (lower.includes('priority') || lower.includes('urgent') || lower.includes('focus')) {
    const sorted = [...subjects].sort((a, b) => a.preparation - b.preparation);
    const top = sorted[0];
    return `Based on your current status, here are your priorities:\n\n1. **${top?.name ?? 'Most urgent subject'}** — ${top?.preparation}% preparation, needs immediate attention\n2. Focus on pending topics: ${top?.pendingTopics.slice(0, 2).join(', ') ?? 'core topics'}\n3. Your next exam is only a few days away\n\nI'd suggest using **Fix My Week** to automatically rebalance your schedule around this priority.`;
  }

  return `I understand you're asking about "${input}". Here's my take:\n\nBased on your current subjects and preparation levels, I'd recommend reviewing your Study Planner and adjusting your daily hours. Your most critical subject right now is the one with the lowest preparation percentage.\n\nTry using the **What-If Simulator** to see how different study schedules would affect your readiness, or tap **Fix My Week** on your dashboard to let me optimize your schedule automatically.\n\nIs there something more specific I can help you with?`;
}

function formatContent(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <span key={i} className="font-semibold text-white">
          {part.slice(2, -2)}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export default function AIAssistant() {
  const { messages, addMessage, subjects } = useApp();
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const subjectsForAI = subjects.map((s) => ({
    name: s.name,
    preparation: s.preparation,
    pendingTopics: s.pendingTopics,
    examDate: s.examDate,
    status: s.status,
  }));

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typing]);

  const handleSend = (text?: string) => {
    const content = (text ?? input).trim();
    if (!content) return;
    setInput('');

    const userMsg: ChatMessage = {
      id: '',
      role: 'user',
      content,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };
    addMessage(userMsg);
    setTyping(true);

    setTimeout(() => {
      const response = generateResponse(content, subjectsForAI);
      const aiMsg: ChatMessage = {
        id: '',
        role: 'ai',
        content: response,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      };
      addMessage(aiMsg);
      setTyping(false);
    }, 1200 + Math.random() * 800);
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      {/* Chat area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scrollbar-thin px-1 pb-4"
      >
        {!hasMessages && !typing && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-sky-500/25 mb-5 animate-fadeInUp">
              <BrainCircuit size={32} className="text-white" />
            </div>
            <h3 className="font-display font-bold text-white text-xl mb-2 animate-fadeInUp" style={{ animationDelay: '80ms' }}>
              EduSync AI
            </h3>
            <p className="text-sm text-slate-400 max-w-md mb-8 animate-fadeInUp" style={{ animationDelay: '160ms' }}>
              Your academic digital twin. Ask me about study planning, exam preparation, or what to
              focus on today.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl">
              {quickPrompts.map((p, i) => {
                const Icon = p.icon;
                return (
                  <button
                    key={i}
                    onClick={() => handleSend(p.text)}
                    className="card-surface rounded-xl p-4 text-left hover:bg-white/5 transition-all group animate-fadeInUp"
                    style={{ animationDelay: `${240 + i * 80}ms` }}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center mb-2"
                      style={{ backgroundColor: `${p.color}15` }}
                    >
                      <Icon size={16} style={{ color: p.color }} />
                    </div>
                    <p className="text-xs text-slate-300 leading-snug group-hover:text-white transition-colors">
                      {p.text}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-4 max-w-3xl mx-auto">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 animate-fadeInUp ${
                msg.role === 'user' ? 'flex-row-reverse' : ''
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-violet-400 to-sky-500'
                    : 'bg-gradient-to-br from-sky-400 to-cyan-500'
                }`}
              >
                {msg.role === 'user' ? (
                  <User size={16} className="text-white" />
                ) : (
                  <BrainCircuit size={16} className="text-white" />
                )}
              </div>
              <div
                className={`flex-1 max-w-[80%] ${
                  msg.role === 'user' ? 'flex flex-col items-end' : ''
                }`}
              >
                <div
                  className={`rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-sky-500/15 border border-sky-500/20'
                      : 'card-surface'
                  }`}
                >
                  <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                    {formatContent(msg.content)}
                  </p>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 px-1">{msg.timestamp}</span>
              </div>
            </div>
          ))}

          {typing && (
            <div className="flex gap-3 animate-fadeIn">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-cyan-500 flex items-center justify-center flex-shrink-0">
                <BrainCircuit size={16} className="text-white" />
              </div>
              <div className="card-surface rounded-2xl px-4 py-3.5">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse-soft" />
                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse-soft" style={{ animationDelay: '0.2s' }} />
                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse-soft" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input area */}
      <div className="pt-3 border-t border-white/6">
        <div className="flex gap-3 max-w-3xl mx-auto">
          <div className="flex-1 relative">
            <Sparkles
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask EduSync AI anything about your studies..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/40 focus:bg-white/8 transition-all"
            />
          </div>
          <button
            onClick={() => handleSend()}
            disabled={!input.trim()}
            className="w-12 h-12 rounded-xl bg-sky-500 hover:bg-sky-400 text-white flex items-center justify-center transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-sky-500/20"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-[10px] text-slate-500 text-center mt-2 max-w-3xl mx-auto">
          EduSync AI uses demo responses. This interface is ready to connect to a real AI API.
        </p>
      </div>
    </div>
  );
}
