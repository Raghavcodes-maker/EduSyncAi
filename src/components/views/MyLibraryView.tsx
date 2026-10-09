import {
  Bookmark,
  Search,
  X,
  Youtube,
  PlaySquare,
  Video,
  ExternalLink,
  Trash2,
  Copy,
  Check,
  Edit3,
  FileText,
  Share2,
} from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import type { BookmarkedYouTubeItem } from '@/types';

function formatItemTime(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 2) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

export interface MyLibraryViewProps {
  bookmarks: BookmarkedYouTubeItem[];
  filteredBookmarks: BookmarkedYouTubeItem[];
  bookmarkTypeCounts: { all: number; channel: number; playlist: number; video: number };
  bookmarkSubjects: string[];
  searchQuery: string;
  onSearchChange: (val: string) => void;
  subjectFilter: string;
  onSubjectFilterChange: (val: string) => void;
  typeFilter: 'all' | 'channel' | 'playlist' | 'video';
  onTypeFilterChange: (val: 'all' | 'channel' | 'playlist' | 'video') => void;
  editingNoteId: string | null;
  noteDraft: string;
  onStartEditNote: (id: string, initialNote?: string) => void;
  onCancelEditNote: () => void;
  onSaveNote: (id: string) => void;
  onNoteDraftChange: (val: string) => void;
  copiedId: string | null;
  onCopyLink: (item: BookmarkedYouTubeItem) => void;
  onRemoveBookmark: (id: string) => void;
  onClearAllBookmarks: () => void;
  onExportLibrary: () => void;
  onBrowseYouTube?: () => void;
  isModal?: boolean;
}

export default function MyLibraryView({
  bookmarks,
  filteredBookmarks,
  bookmarkTypeCounts,
  bookmarkSubjects,
  searchQuery,
  onSearchChange,
  subjectFilter,
  onSubjectFilterChange,
  typeFilter,
  onTypeFilterChange,
  editingNoteId,
  noteDraft,
  onStartEditNote,
  onCancelEditNote,
  onSaveNote,
  onNoteDraftChange,
  copiedId,
  onCopyLink,
  onRemoveBookmark,
  onClearAllBookmarks,
  onExportLibrary,
  onBrowseYouTube,
  isModal = false,
}: MyLibraryViewProps) {
  return (
    <div className="space-y-5">
      {/* Header Banner - only shown when not embedded in modal */}
      {!isModal && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-950/20 to-transparent border border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0 shadow-lg shadow-amber-500/10">
              <Bookmark size={22} className="fill-amber-400" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-white flex items-center gap-2">
                My YouTube Learning Library
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                  {bookmarks.length} saved
                </span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Saved university channels, course playlists, and topic video lectures for exam prep and revision.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {bookmarks.length > 0 && (
              <button
                type="button"
                onClick={onExportLibrary}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 hover:text-white transition-all cursor-pointer"
                title="Copy all saved study links to clipboard"
              >
                <Share2 size={13} className="text-amber-400" />
                <span>Export Study Links</span>
              </button>
            )}

            {bookmarks.length > 1 && (
              <button
                type="button"
                onClick={onClearAllBookmarks}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-xs font-semibold text-red-300 transition-all cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Clear All</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      {bookmarks.length > 0 && (
        <Card className="p-4" delay={0}>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Search input */}
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search by channel, playlist, topic, or study note..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => onSearchChange('')}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Subject filter */}
              {bookmarkSubjects.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 flex-shrink-0">Subject:</span>
                  <select
                    value={subjectFilter}
                    onChange={(e) => onSubjectFilterChange(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500/50 transition-colors cursor-pointer"
                  >
                    <option value="all" className="bg-slate-800">All Subjects</option>
                    {bookmarkSubjects.map((s) => (
                      <option key={s} value={s} className="bg-slate-800">{s}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Resource Type Filter Pills */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/8">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onTypeFilterChange('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    typeFilter === 'all'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                      : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  All ({bookmarkTypeCounts.all})
                </button>
                <button
                  type="button"
                  onClick={() => onTypeFilterChange('channel')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    typeFilter === 'channel'
                      ? 'bg-red-500 text-white font-bold shadow-md shadow-red-500/20'
                      : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Youtube size={12} className={typeFilter === 'channel' ? 'text-white' : 'text-red-400'} />
                  Channels ({bookmarkTypeCounts.channel})
                </button>
                <button
                  type="button"
                  onClick={() => onTypeFilterChange('playlist')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    typeFilter === 'playlist'
                      ? 'bg-purple-600 text-white font-bold shadow-md shadow-purple-600/20'
                      : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <PlaySquare size={12} className={typeFilter === 'playlist' ? 'text-white' : 'text-purple-400'} />
                  Playlists ({bookmarkTypeCounts.playlist})
                </button>
                <button
                  type="button"
                  onClick={() => onTypeFilterChange('video')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    typeFilter === 'video'
                      ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/20'
                      : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Video size={12} className={typeFilter === 'video' ? 'text-white' : 'text-blue-400'} />
                  Videos ({bookmarkTypeCounts.video})
                </button>
              </div>

              {isModal && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onExportLibrary}
                    className="text-xs text-amber-300 hover:text-amber-200 flex items-center gap-1 font-medium cursor-pointer"
                    title="Export study links"
                  >
                    <Share2 size={12} /> Export
                  </button>
                  {bookmarks.length > 1 && (
                    <button
                      type="button"
                      onClick={onClearAllBookmarks}
                      className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 font-medium cursor-pointer"
                    >
                      <Trash2 size={12} /> Clear
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Empty States */}
      {filteredBookmarks.length === 0 ? (
        <div className="p-10 text-center rounded-2xl bg-white/3 border border-white/8 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400 shadow-lg shadow-amber-500/5">
            <Bookmark size={26} className={bookmarks.length === 0 ? 'fill-amber-400/20' : ''} />
          </div>
          <h4 className="font-display font-semibold text-white text-base">
            {bookmarks.length === 0 ? 'Your YouTube Study Library is Empty' : 'No Bookmarks Match Current Filter'}
          </h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            {bookmarks.length === 0
              ? 'Click the "Save" or Bookmark icon on any YouTube channel discovery, course playlist, or recommended video to keep it here in your personal library for quick exam revision.'
              : 'Try clearing your search keyword, changing the subject, or switching the resource type filter.'}
          </p>
          {bookmarks.length === 0 && onBrowseYouTube && (
            <div className="pt-2">
              <Button
                variant="primary"
                size="sm"
                icon={<Youtube size={15} />}
                onClick={onBrowseYouTube}
              >
                Browse YouTube Channel Discovery
              </Button>
            </div>
          )}
          {bookmarks.length > 0 && (
            <div className="pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  onSearchChange('');
                  onSubjectFilterChange('all');
                  onTypeFilterChange('all');
                }}
              >
                Reset All Filters
              </Button>
            </div>
          )}
        </div>
      ) : (
        /* Cards Grid */
        <div
          className={`grid grid-cols-1 ${
            isModal ? 'gap-3 max-h-[58vh] overflow-y-auto pr-1 scrollbar-thin' : 'md:grid-cols-2 gap-4'
          }`}
        >
          {filteredBookmarks.map((item) => {
            const isEditingNote = editingNoteId === item.id;
            const isCopied = copiedId === item.id;

            return (
              <Card
                key={item.id}
                className="p-5 border border-white/10 hover:border-amber-500/40 hover:bg-white/4 transition-all flex flex-col justify-between group"
                delay={0}
              >
                <div className="space-y-3">
                  {/* Top Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center flex-shrink-0 text-red-400 shadow-md shadow-red-600/10">
                        <Youtube size={22} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <a
                            href={item.channelUrl || item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-bold text-white hover:text-amber-300 transition-colors flex items-center gap-1.5 truncate"
                          >
                            <span className="truncate">{item.channelName}</span>
                            <ExternalLink size={12} className="text-slate-500 hover:text-amber-300 flex-shrink-0 transition-colors" />
                          </a>
                        </div>
                        {item.channelHandle && (
                          <p className="text-[11px] text-slate-400">{item.channelHandle}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {/* Resource Type Badge */}
                      {item.resourceType === 'playlist' ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/25 font-semibold flex items-center gap-1">
                          <PlaySquare size={10} /> Course Playlist
                        </span>
                      ) : item.resourceType === 'video' ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/25 font-semibold flex items-center gap-1">
                          <Video size={10} /> Video Lesson
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/15 text-red-300 border border-red-500/25 font-semibold flex items-center gap-1">
                          <Youtube size={10} /> Channel
                        </span>
                      )}

                      {/* Subject Badge */}
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/25 font-semibold">
                        {item.subjectName}
                      </span>

                      {/* Copy Link button */}
                      <button
                        type="button"
                        onClick={() => onCopyLink(item)}
                        title={isCopied ? 'Link Copied!' : 'Copy YouTube Link'}
                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                          isCopied
                            ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:text-amber-300 hover:bg-amber-500/10'
                        }`}
                      >
                        {isCopied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                      </button>

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => onRemoveBookmark(item.id)}
                        title="Remove from My Library"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  {item.title && (
                    <p className="text-xs font-semibold text-slate-200 leading-snug">
                      {item.title}
                    </p>
                  )}

                  {/* Focus Area */}
                  {item.focusArea && (
                    <div className="p-2 rounded-lg bg-white/4 border border-white/6 text-[11px] text-slate-300">
                      <span className="text-slate-400 font-medium">Curriculum Focus: </span>
                      <span className="text-white font-medium">{item.focusArea}</span>
                    </div>
                  )}

                  {/* Why Relevant */}
                  {item.whyRelevant && (
                    <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                      {item.whyRelevant}
                    </p>
                  )}

                  {/* Topics Pills */}
                  {item.relevantTopics && item.relevantTopics.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.relevantTopics.slice(0, 5).map((topic, ti) => (
                        <span
                          key={ti}
                          className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-slate-300 border border-white/8"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Personal Study Note Feature */}
                  <div className="pt-2 border-t border-white/6">
                    {isEditingNote ? (
                      <div className="space-y-2 p-2.5 rounded-xl bg-white/5 border border-amber-500/30 animate-fadeIn">
                        <label className="text-[11px] text-amber-300 font-medium flex items-center gap-1">
                          <Edit3 size={11} />
                          Personal Study Note / Exam Tip
                        </label>
                        <textarea
                          rows={2}
                          value={noteDraft}
                          onChange={(e) => onNoteDraftChange(e.target.value)}
                          placeholder="e.g. Must finish playlists for Unit 2 mid-sem; key problem sets in lecture 14..."
                          className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
                          autoFocus
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={onCancelEditNote}
                            className="px-2 py-1 rounded-md text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => onSaveNote(item.id)}
                            className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Check size={11} /> Save Note
                          </button>
                        </div>
                      </div>
                    ) : item.userNotes ? (
                      <div className="p-2.5 rounded-xl bg-amber-500/8 border border-amber-500/20 flex items-start justify-between gap-2 group/note">
                        <div className="space-y-0.5 min-w-0">
                          <span className="text-[10px] uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1">
                            <FileText size={10} /> Personal Note
                          </span>
                          <p className="text-xs text-amber-100/90 leading-relaxed break-words">
                            {item.userNotes}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onStartEditNote(item.id, item.userNotes)}
                          className="p-1 rounded text-slate-400 hover:text-amber-300 transition-colors flex-shrink-0 cursor-pointer"
                          title="Edit study note"
                        >
                          <Edit3 size={12} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onStartEditNote(item.id, '')}
                        className="text-[11px] text-slate-500 hover:text-amber-300 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Edit3 size={11} /> + Add personal study note
                      </button>
                    )}
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-3 mt-3 border-t border-white/8 flex items-center justify-between gap-3">
                  <span className="text-[10px] text-slate-500">
                    Saved {formatItemTime(item.bookmarkedAt)}
                  </span>

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-xs shadow-md shadow-red-600/25 transition-all hover:translate-x-0.5"
                  >
                    <span>▶ Start Learning</span>
                    <ExternalLink size={11} />
                  </a>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
