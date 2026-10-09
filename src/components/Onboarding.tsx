import { useState } from 'react';
import { BrainCircuit, ArrowRight, ArrowLeft, Check, GraduationCap, School, Plus, X, CalendarClock } from 'lucide-react';
import Button from '@/components/ui/Button';
import {
  SCHOOL_SUBJECTS,
  COLLEGE_SUBJECTS,
  SCHOOL_BOARDS,
  COLLEGE_PROGRAMS,
  type StudentProfile,
  type EducationLevel,
  type SchoolBoard,
  type CollegeProgram,
  type SubjectSeed,
} from '@/types';

interface OnboardingProps {
  onComplete: (profile: StudentProfile) => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [educationLevel, setEducationLevel] = useState<EducationLevel | ''>('');
  // School
  const [grade, setGrade] = useState('');
  const [board, setBoard] = useState<SchoolBoard | ''>('');
  // College
  const [university, setUniversity] = useState('');
  const [program, setProgram] = useState<CollegeProgram | ''>('');
  const [customProgram, setCustomProgram] = useState('');
  const [yearOrSemester, setYearOrSemester] = useState('');
  // Shared
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [customSubject, setCustomSubject] = useState('');
  const [subjectPreps, setSubjectPreps] = useState<Record<string, number>>({});
  const [subjectExams, setSubjectExams] = useState<Record<string, string>>({});

  const isSchool = educationLevel === 'school';
  const suggestedSubjects = isSchool ? SCHOOL_SUBJECTS : COLLEGE_SUBJECTS;

  const totalSteps = isSchool ? 5 : 5; // welcome+name, education, details, subjects, prep+exams

  const canContinue = (): boolean => {
    if (step === 0) return name.trim().length > 0;
    if (step === 1) return educationLevel !== '';
    if (step === 2) {
      if (isSchool) return grade.trim().length > 0 && board !== '';
      return university.trim().length > 0 && (program !== '' || customProgram.trim().length > 0) && yearOrSemester.trim().length > 0;
    }
    if (step === 3) return selectedSubjects.length > 0;
    return true; // step 4 is optional prep
  };

  const toggleSubject = (subj: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subj) ? prev.filter((s) => s !== subj) : [...prev, subj]
    );
    setSubjectPreps((prev) => ({ ...prev, [subj]: prev[subj] ?? 50 }));
  };

  const addCustomSubject = () => {
    const trimmed = customSubject.trim();
    if (!trimmed || selectedSubjects.includes(trimmed)) return;
    setSelectedSubjects((prev) => [...prev, trimmed]);
    setSubjectPreps((prev) => ({ ...prev, [trimmed]: 50 }));
    setCustomSubject('');
  };

  const handleFinish = () => {
    const finalProgram = program === 'Other' ? customProgram.trim() : (program ?? '');
    const subjects: SubjectSeed[] = selectedSubjects.map((name) => ({
      name,
      preparation: subjectPreps[name] ?? 50,
      examDate: subjectExams[name] || undefined,
    }));

    const profile: StudentProfile = {
      name: name.trim(),
      educationLevel: educationLevel as EducationLevel,
      subjects,
      onboarded: true,
      ...(isSchool
        ? { grade: grade.trim(), board: board as SchoolBoard }
        : {
            university: university.trim(),
            program: finalProgram,
            yearOrSemester: yearOrSemester.trim(),
          }),
    };
    onComplete(profile);
  };

  const stepTitles = ['Welcome', 'Education', isSchool ? 'Class Details' : 'College Details', 'Subjects', 'Preparation'];

  return (
    <div className="min-h-screen bg-[#0a0c14] flex items-center justify-center p-4">
      {/* Background accents */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-sky-500/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-cyan-500/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-400 to-cyan-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <BrainCircuit size={26} className="text-white" />
          </div>
          <div className="text-left">
            <h1 className="font-display font-bold text-white text-xl">EduSync AI</h1>
            <p className="text-[10px] text-slate-400 tracking-wide">YOUR ACADEMIC DIGITAL TWIN</p>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-6 px-2">
          {stepTitles.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full flex-1 transition-all duration-300 ${
                i <= step ? 'bg-sky-400' : 'bg-white/8'
              }`}
            />
          ))}
        </div>

        {/* Card */}
        <div className="glass-strong rounded-2xl p-7 animate-scaleIn" key={step}>
          {/* Step 0: Welcome + Name */}
          {step === 0 && (
            <div className="text-center">
              <h2 className="font-display font-bold text-white text-2xl mb-2">Welcome to EduSync AI</h2>
              <p className="text-sm text-slate-400 mb-7">Let's personalize your academic command center.</p>
              <div className="text-left">
                <label className="text-xs text-slate-400 mb-2 block">What is your name?</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && canContinue() && setStep(1)}
                  placeholder="Enter your name"
                  autoFocus
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-base text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 transition-colors text-center"
                />
              </div>
            </div>
          )}

          {/* Step 1: Education Level */}
          {step === 1 && (
            <div>
              <h2 className="font-display font-bold text-white text-xl mb-1">Are you a School or College student?</h2>
              <p className="text-sm text-slate-400 mb-6">This helps us tailor your experience.</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setEducationLevel('school')}
                  className={`p-5 rounded-xl border transition-all ${
                    educationLevel === 'school'
                      ? 'bg-sky-500/15 border-sky-500/40'
                      : 'bg-white/5 border-white/10 hover:bg-white/8'
                  }`}
                >
                  <School size={28} className={educationLevel === 'school' ? 'text-sky-400 mx-auto' : 'text-slate-400 mx-auto'} />
                  <p className={`font-medium text-sm mt-2 ${educationLevel === 'school' ? 'text-sky-400' : 'text-slate-300'}`}>School Student</p>
                </button>
                <button
                  onClick={() => setEducationLevel('college')}
                  className={`p-5 rounded-xl border transition-all ${
                    educationLevel === 'college'
                      ? 'bg-sky-500/15 border-sky-500/40'
                      : 'bg-white/5 border-white/10 hover:bg-white/8'
                  }`}
                >
                  <GraduationCap size={28} className={educationLevel === 'college' ? 'text-sky-400 mx-auto' : 'text-slate-400 mx-auto'} />
                  <p className={`font-medium text-sm mt-2 ${educationLevel === 'college' ? 'text-sky-400' : 'text-slate-300'}`}>College Student</p>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: School or College details */}
          {step === 2 && isSchool && (
            <div>
              <h2 className="font-display font-bold text-white text-xl mb-1">Class Details</h2>
              <p className="text-sm text-slate-400 mb-6">Tell us about your class and board.</p>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Class / Grade</label>
                  <input
                    type="text"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    placeholder="e.g. 12, 11, 10"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Board</label>
                  <div className="grid grid-cols-2 gap-2">
                    {SCHOOL_BOARDS.map((b) => (
                      <button
                        key={b}
                        onClick={() => setBoard(b)}
                        className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                          board === b
                            ? 'bg-sky-500/15 border-sky-500/40 text-sky-400'
                            : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/8'
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && !isSchool && (
            <div>
              <h2 className="font-display font-bold text-white text-xl mb-1">College Details</h2>
              <p className="text-sm text-slate-400 mb-6">Tell us about your college and program.</p>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">College / University</label>
                  <input
                    type="text"
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    placeholder="e.g. IPU, Delhi University"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Degree / Program</label>
                  <div className="grid grid-cols-3 gap-2">
                    {COLLEGE_PROGRAMS.map((p) => (
                      <button
                        key={p}
                        onClick={() => setProgram(p)}
                        className={`px-2 py-2 rounded-lg text-xs font-medium border transition-all ${
                          program === p
                            ? 'bg-sky-500/15 border-sky-500/40 text-sky-400'
                            : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/8'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                  {program === 'Other' && (
                    <input
                      type="text"
                      value={customProgram}
                      onChange={(e) => setCustomProgram(e.target.value)}
                      placeholder="Enter your program"
                      className="w-full mt-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 transition-colors"
                    />
                  )}
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Year / Semester</label>
                  <input
                    type="text"
                    value={yearOrSemester}
                    onChange={(e) => setYearOrSemester(e.target.value)}
                    placeholder="e.g. 1st Year, 3rd Semester"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Subjects */}
          {step === 3 && (
            <div>
              <h2 className="font-display font-bold text-white text-xl mb-1">Select your subjects</h2>
              <p className="text-sm text-slate-400 mb-5">Tap to select. You can also add custom subjects.</p>
              <div className="flex flex-wrap gap-2 mb-4 max-h-48 overflow-y-auto scrollbar-thin">
                {suggestedSubjects.map((subj) => (
                  <button
                    key={subj}
                    onClick={() => toggleSubject(subj)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                      selectedSubjects.includes(subj)
                        ? 'bg-sky-500/15 border-sky-500/40 text-sky-400'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/8'
                    }`}
                  >
                    {selectedSubjects.includes(subj) && <Check size={11} className="inline mr-1" />}
                    {subj}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCustomSubject()}
                  placeholder="Add a custom subject"
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 transition-colors"
                />
                <Button variant="secondary" size="sm" icon={<Plus size={14} />} onClick={addCustomSubject}>
                  Add
                </Button>
              </div>
              {selectedSubjects.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {selectedSubjects.map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md bg-sky-500/10 text-sky-300 border border-sky-500/20"
                    >
                      {s}
                      <button onClick={() => toggleSubject(s)} className="text-slate-500 hover:text-red-400">
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Preparation + Exam dates (optional) */}
          {step === 4 && (
            <div>
              <h2 className="font-display font-bold text-white text-xl mb-1">Preparation & Exam Dates</h2>
              <p className="text-sm text-slate-400 mb-5">Optional — you can skip and update later.</p>
              <div className="space-y-3 max-h-72 overflow-y-auto scrollbar-thin pr-1">
                {selectedSubjects.map((subj) => (
                  <div key={subj} className="card-surface rounded-xl p-3">
                    <p className="text-sm font-medium text-white mb-2">{subj}</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <label className="text-[10px] text-slate-400 block mb-1">Preparation: {subjectPreps[subj] ?? 50}%</label>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={subjectPreps[subj] ?? 50}
                          onChange={(e) => setSubjectPreps((prev) => ({ ...prev, [subj]: parseInt(e.target.value) }))}
                          className="w-full"
                          style={{
                            background: `linear-gradient(to right, #38bdf8 0%, #38bdf8 ${subjectPreps[subj] ?? 50}%, rgba(255,255,255,0.08) ${subjectPreps[subj] ?? 50}%, rgba(255,255,255,0.08) 100%)`,
                            borderRadius: '3px',
                            height: '5px',
                          }}
                        />
                      </div>
                      <div className="w-36">
                        <label className="text-[10px] text-slate-400 flex items-center gap-1 mb-1">
                          <CalendarClock size={10} /> Exam date
                        </label>
                        <input
                          type="date"
                          value={subjectExams[subj] ?? ''}
                          onChange={(e) => setSubjectExams((prev) => ({ ...prev, [subj]: e.target.value }))}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500/50 transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-7">
            {step > 0 ? (
              <Button variant="ghost" size="md" icon={<ArrowLeft size={16} />} onClick={() => setStep(step - 1)}>
                Back
              </Button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-2">
              {step === 4 && (
                <Button variant="secondary" size="md" onClick={handleFinish}>
                  Skip
                </Button>
              )}
              {step < 4 ? (
                <Button
                  variant="primary"
                  size="md"
                  icon={<ArrowRight size={16} />}
                  disabled={!canContinue()}
                  onClick={() => setStep(step + 1)}
                >
                  Continue
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="md"
                  icon={<Check size={16} />}
                  onClick={handleFinish}
                >
                  Complete Setup
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Step indicator text */}
        <p className="text-center text-[11px] text-slate-500 mt-4">
          Step {step + 1} of {totalSteps} · {stepTitles[step]}
        </p>
      </div>
    </div>
  );
}
