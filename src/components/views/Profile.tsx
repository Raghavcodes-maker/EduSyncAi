import { useState } from 'react';
import { User, School, GraduationCap, BookOpen, Trash2, Save, RotateCcw, CalendarClock } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { useApp, getProfileSubtitle, getProfileInitials, computeStatus, computeDifficulty } from '@/context/AppContext';
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

interface ProfileProps {
  onResetOnboarding: () => void;
}

export default function Profile({ onResetOnboarding }: ProfileProps) {
  const { profile, updateProfile, resetProfile } = useApp();
  const [editing, setEditing] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  // Edit form state
  const [name, setName] = useState(profile?.name ?? '');
  const [educationLevel, setEducationLevel] = useState<EducationLevel>(profile?.educationLevel ?? 'school');
  const [grade, setGrade] = useState(profile?.grade ?? '');
  const [board, setBoard] = useState<SchoolBoard | ''>((profile?.board as SchoolBoard) ?? '');
  const [university, setUniversity] = useState(profile?.university ?? '');
  const [program, setProgram] = useState<CollegeProgram | ''>(
    (COLLEGE_PROGRAMS.includes(profile?.program as CollegeProgram) ? profile?.program : 'Other') as CollegeProgram
  );
  const [customProgram, setCustomProgram] = useState(
    COLLEGE_PROGRAMS.includes(profile?.program as CollegeProgram) ? '' : (profile?.program ?? '')
  );
  const [yearOrSemester, setYearOrSemester] = useState(profile?.yearOrSemester ?? '');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(profile?.subjects.map((s) => s.name) ?? []);
  const [customSubject, setCustomSubject] = useState('');
  const [subjectPreps, setSubjectPreps] = useState<Record<string, number>>(
    Object.fromEntries(profile?.subjects.map((s) => [s.name, s.preparation]) ?? [])
  );
  const [subjectExams, setSubjectExams] = useState<Record<string, string>>(
    Object.fromEntries(profile?.subjects.filter((s) => s.examDate).map((s) => [s.name, s.examDate!]) ?? [])
  );

  if (!profile) return null;

  const isSchool = profile.educationLevel === 'school';

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

  const handleSave = () => {
    const finalProgram = program === 'Other' ? customProgram.trim() : (program ?? '');
    const subjects: SubjectSeed[] = selectedSubjects.map((subjName) => ({
      name: subjName,
      preparation: subjectPreps[subjName] ?? 50,
      examDate: subjectExams[subjName] || undefined,
    }));

    const updated: StudentProfile = {
      name: name.trim() || profile.name,
      educationLevel,
      subjects,
      onboarded: true,
      ...(educationLevel === 'school'
        ? { grade: grade.trim(), board: board as SchoolBoard }
        : {
            university: university.trim(),
            program: finalProgram,
            yearOrSemester: yearOrSemester.trim(),
          }),
    };
    updateProfile(updated);
    setEditing(false);
  };

  const handleReset = () => {
    resetProfile();
    setConfirmReset(false);
    onResetOnboarding();
  };

  const suggestedSubjects = isSchool ? SCHOOL_SUBJECTS : COLLEGE_SUBJECTS;

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      {/* Profile card */}
      <Card className="p-6" delay={0}>
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-400 to-cyan-500 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-sky-500/20">
            {getProfileInitials(profile)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-display font-bold text-white text-xl">{profile.name}</h2>
            <p className="text-sm text-slate-400">{getProfileSubtitle(profile)}</p>
            <div className="flex items-center gap-2 mt-2">
              {isSchool ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-sky-400 bg-sky-500/10 px-2 py-1 rounded-md">
                  <School size={12} /> School Student
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md">
                  <GraduationCap size={12} /> College Student
                </span>
              )}
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
            Edit Profile
          </Button>
        </div>
      </Card>

      {/* Subjects summary */}
      <Card className="p-6" delay={60}>
        <div className="flex items-center gap-2 mb-4">
          <BookOpen size={18} className="text-sky-400" />
          <h3 className="font-display font-semibold text-white text-base">Your Subjects</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {profile.subjects.map((s, i) => (
            <div key={i} className="card-surface rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-white">{s.name}</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${
                  computeStatus(s.preparation) === 'On Track' ? 'bg-emerald-500/15 text-emerald-400' :
                  computeStatus(s.preparation) === 'At Risk' ? 'bg-amber-500/15 text-amber-400' :
                  'bg-red-500/15 text-red-400'
                }`}>
                  {computeStatus(s.preparation)}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Preparation: {s.preparation}% · {computeDifficulty(s.preparation)}</p>
              {s.examDate && (
                <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                  <CalendarClock size={10} /> {s.examDate}
                </p>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Danger zone */}
      <Card className="p-6" delay={120}>
        <div className="flex items-center gap-2 mb-3">
          <RotateCcw size={18} className="text-red-400" />
          <h3 className="font-display font-semibold text-white text-base">Reset</h3>
        </div>
        <p className="text-sm text-slate-400 mb-4">
          Reset your profile and start the onboarding experience again. This will clear all your subjects and data.
        </p>
        <Button variant="danger" size="md" icon={<Trash2 size={16} />} onClick={() => setConfirmReset(true)}>
          Reset Profile
        </Button>
      </Card>

      {/* Edit Modal */}
      <Modal
        open={editing}
        onClose={() => setEditing(false)}
        title="Edit Profile"
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500/50 transition-colors"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Education Level</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setEducationLevel('school')}
                className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                  educationLevel === 'school' ? 'bg-sky-500/15 border-sky-500/40 text-sky-400' : 'bg-white/5 border-white/10 text-slate-300'
                }`}
              >
                School
              </button>
              <button
                onClick={() => setEducationLevel('college')}
                className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                  educationLevel === 'college' ? 'bg-sky-500/15 border-sky-500/40 text-sky-400' : 'bg-white/5 border-white/10 text-slate-300'
                }`}
              >
                College
              </button>
            </div>
          </div>

          {educationLevel === 'school' ? (
            <>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Class / Grade</label>
                <input
                  type="text"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Board</label>
                <div className="grid grid-cols-4 gap-2">
                  {SCHOOL_BOARDS.map((b) => (
                    <button
                      key={b}
                      onClick={() => setBoard(b)}
                      className={`px-2 py-2 rounded-lg text-xs font-medium border transition-all ${
                        board === b ? 'bg-sky-500/15 border-sky-500/40 text-sky-400' : 'bg-white/5 border-white/10 text-slate-300'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">College / University</label>
                <input
                  type="text"
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Degree / Program</label>
                <div className="grid grid-cols-4 gap-2">
                  {COLLEGE_PROGRAMS.map((p) => (
                    <button
                      key={p}
                      onClick={() => setProgram(p)}
                      className={`px-2 py-2 rounded-lg text-xs font-medium border transition-all ${
                        program === p ? 'bg-sky-500/15 border-sky-500/40 text-sky-400' : 'bg-white/5 border-white/10 text-slate-300'
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
                    className="w-full mt-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500/50 transition-colors"
                  />
                )}
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Year / Semester</label>
                <input
                  type="text"
                  value={yearOrSemester}
                  onChange={(e) => setYearOrSemester(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500/50 transition-colors"
                />
              </div>
            </>
          )}

          {/* Subject selection */}
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">Subjects</label>
            <div className="flex flex-wrap gap-2 mb-2 max-h-32 overflow-y-auto scrollbar-thin">
              {suggestedSubjects.map((subj) => (
                <button
                  key={subj}
                  onClick={() => toggleSubject(subj)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    selectedSubjects.includes(subj) ? 'bg-sky-500/15 border-sky-500/40 text-sky-400' : 'bg-white/5 border-white/10 text-slate-300'
                  }`}
                >
                  {selectedSubjects.includes(subj) && '✓ '}{subj}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustomSubject()}
                placeholder="Add custom subject"
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 transition-colors"
              />
              <Button variant="secondary" size="sm" onClick={addCustomSubject}>Add</Button>
            </div>
            {selectedSubjects.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {selectedSubjects.map((s) => (
                  <span key={s} className="text-[11px] px-2 py-1 rounded-md bg-sky-500/10 text-sky-300 border border-sky-500/20">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="primary" size="md" icon={<Save size={16} />} onClick={handleSave} className="flex-1">
              Save Changes
            </Button>
            <Button variant="secondary" size="md" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reset confirmation */}
      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset Profile" maxWidth="max-w-sm">
        <p className="text-sm text-slate-300 mb-5">
          This will clear your profile, subjects, and all study data, then restart the onboarding experience. Are you sure?
        </p>
        <div className="flex gap-3">
          <Button variant="danger" size="md" icon={<Trash2 size={16} />} onClick={handleReset} className="flex-1">
            Reset Everything
          </Button>
          <Button variant="secondary" size="md" onClick={() => setConfirmReset(false)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  );
}
