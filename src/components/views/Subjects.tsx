import { useState } from 'react';
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  CalendarClock,
  Layers,
  X,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import ProgressBar from '@/components/ui/ProgressBar';
import { StatusBadge, DifficultyBadge } from '@/components/ui/Badges';
import { useApp } from '@/context/AppContext';
import type { Subject, Difficulty, SubjectStatus } from '@/types';

const colorPalette = [
  '#38bdf8', '#34d399', '#fbbf24', '#f87171', '#a78bfa',
  '#fb923c', '#2dd4bf', '#f472b6', '#60a5fa', '#a3e635',
];

const emptySubject: Subject = {
  id: '',
  name: '',
  code: '',
  preparation: 50,
  difficulty: 'Moderate',
  pendingTopics: [],
  examDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
  status: 'On Track',
  color: '#38bdf8',
  credits: 3,
};

export default function Subjects() {
  const { subjects, addSubject, updateSubject, deleteSubject, setPreparation } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Subject | null>(null);
  const [topicInput, setTopicInput] = useState('');

  const openAdd = () => {
    setEditing({ ...emptySubject, id: '', color: colorPalette[subjects.length % colorPalette.length] });
    setTopicInput('');
    setModalOpen(true);
  };

  const openEdit = (s: Subject) => {
    setEditing({ ...s });
    setTopicInput('');
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!editing || !editing.name.trim()) return;
    if (editing.id) {
      updateSubject(editing);
    } else {
      addSubject(editing);
    }
    setModalOpen(false);
    setEditing(null);
  };

  const addTopic = () => {
    if (!topicInput.trim() || !editing) return;
    setEditing({
      ...editing,
      pendingTopics: [...editing.pendingTopics, topicInput.trim()],
    });
    setTopicInput('');
  };

  const removeTopic = (idx: number) => {
    if (!editing) return;
    setEditing({
      ...editing,
      pendingTopics: editing.pendingTopics.filter((_, i) => i !== idx),
    });
  };

  const computeStatus = (prep: number): SubjectStatus => {
    if (prep >= 80) return 'On Track';
    if (prep >= 55) return 'On Track';
    if (prep >= 35) return 'At Risk';
    return 'Critical';
  };

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">
            {subjects.length} subjects ·{' '}
            {subjects.filter((s) => s.status === 'On Track').length} on track ·{' '}
            {subjects.filter((s) => s.status === 'Critical').length} critical
          </p>
        </div>
        <Button variant="primary" size="md" icon={<Plus size={16} />} onClick={openAdd}>
          Add Subject
        </Button>
      </div>

      {/* Subject cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {subjects.map((s, i) => {
          const daysLeft = Math.ceil(
            (new Date(s.examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );
          return (
            <Card key={s.id} hover delay={i * 50} className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${s.color}15` }}
                  >
                    <BookOpen size={20} style={{ color: s.color }} />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-white">{s.name}</h3>
                    <p className="text-xs text-slate-400">
                      {s.code} · {s.credits} credits
                    </p>
                  </div>
                </div>
                <StatusBadge status={s.status} />
              </div>

              {/* Preparation slider */}
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-2">
                  <span className="text-slate-400">Preparation</span>
                  <span className="font-display font-bold text-white">{s.preparation}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={s.preparation}
                  onChange={(e) => setPreparation(s.id, parseInt(e.target.value))}
                  className="w-full"
                  style={{
                    background: `linear-gradient(to right, ${s.color} 0%, ${s.color} ${s.preparation}%, rgba(255,255,255,0.08) ${s.preparation}%, rgba(255,255,255,0.08) 100%)`,
                    borderRadius: '3px',
                    height: '6px',
                  }}
                />
                <ProgressBar value={s.preparation} color={s.color} height="h-1" animated={false} />
              </div>

              {/* Meta info */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="card-surface rounded-lg p-2.5">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Difficulty</p>
                  <DifficultyBadge difficulty={s.difficulty} />
                </div>
                <div className="card-surface rounded-lg p-2.5">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Exam In</p>
                  <p className="text-sm font-medium text-white flex items-center gap-1.5">
                    <CalendarClock size={14} style={{ color: s.color }} />
                    {daysLeft} days
                  </p>
                </div>
              </div>

              {/* Pending topics */}
              <div className="mb-4">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Layers size={11} /> Pending Topics ({s.pendingTopics.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {s.pendingTopics.length === 0 && (
                    <span className="text-xs text-slate-500">All topics covered</span>
                  )}
                  {s.pendingTopics.map((topic: string, idx: number) => (
                    <span
                      key={idx}
                      className="text-[11px] px-2 py-1 rounded-md bg-white/5 text-slate-300 border border-white/5"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-3 border-t border-white/6">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Pencil size={13} />}
                  onClick={() => openEdit(s)}
                  className="flex-1"
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Trash2 size={13} />}
                  onClick={() => setConfirmDelete(s)}
                  className="text-red-400 hover:bg-red-500/10"
                >
                  Delete
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing?.id ? 'Edit Subject' : 'Add New Subject'}
      >
        {editing && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Subject Name</label>
                <input
                  type="text"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="e.g. Linear Algebra"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Course Code</label>
                <input
                  type="text"
                  value={editing.code}
                  onChange={(e) => setEditing({ ...editing, code: e.target.value })}
                  placeholder="e.g. MATH 301"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Difficulty</label>
                <select
                  value={editing.difficulty}
                  onChange={(e) =>
                    setEditing({ ...editing, difficulty: e.target.value as Difficulty })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500/50 transition-colors"
                >
                  <option value="Easy" className="bg-slate-800">Easy</option>
                  <option value="Moderate" className="bg-slate-800">Moderate</option>
                  <option value="Hard" className="bg-slate-800">Hard</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Exam Date</label>
                <input
                  type="date"
                  value={editing.examDate}
                  onChange={(e) => setEditing({ ...editing, examDate: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500/50 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">
                  Preparation: {editing.preparation}%
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={editing.preparation}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setEditing({
                      ...editing,
                      preparation: val,
                      status: computeStatus(val),
                    });
                  }}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1.5 block">Credits</label>
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={editing.credits}
                  onChange={(e) =>
                    setEditing({ ...editing, credits: parseInt(e.target.value) || 3 })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500/50 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Color</label>
              <div className="flex gap-2 flex-wrap">
                {colorPalette.map((c) => (
                  <button
                    key={c}
                    onClick={() => setEditing({ ...editing, color: c })}
                    className={`w-7 h-7 rounded-lg transition-all ${
                      editing.color === c ? 'ring-2 ring-white/40 scale-110' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">Pending Topics</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTopic()}
                  placeholder="Add a topic and press Enter"
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 transition-colors"
                />
                <Button variant="secondary" size="sm" icon={<Plus size={14} />} onClick={addTopic}>
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {editing.pendingTopics.map((t, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md bg-white/5 text-slate-300 border border-white/5"
                  >
                    {t}
                    <button onClick={() => removeTopic(idx)} className="text-slate-500 hover:text-red-400">
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="primary" size="md" onClick={handleSave} className="flex-1">
                {editing.id ? 'Save Changes' : 'Add Subject'}
              </Button>
              <Button variant="secondary" size="md" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Subject"
        maxWidth="max-w-sm"
      >
        <p className="text-sm text-slate-300 mb-5">
          Are you sure you want to delete{' '}
          <span className="font-medium text-white">{confirmDelete?.name}</span>? This action cannot
          be undone.
        </p>
        <div className="flex gap-3">
          <Button
            variant="danger"
            size="md"
            icon={<Trash2 size={16} />}
            onClick={() => {
              if (confirmDelete) deleteSubject(confirmDelete.id);
              setConfirmDelete(null);
            }}
            className="flex-1"
          >
            Delete
          </Button>
          <Button variant="secondary" size="md" onClick={() => setConfirmDelete(null)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  );
}
