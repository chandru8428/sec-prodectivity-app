export default function SubjectCard({ subject, selected, onToggle }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(subject.code)}
      className={`glass-card rounded-3xl p-5 text-left transition duration-200 hover:-translate-y-1 ${
        selected ? 'ring-2 ring-sky-300/70 bg-sky-400/10' : ''
      }`}
    >
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
        {subject.code}
      </div>
      <div className="text-lg font-semibold">{subject.name}</div>
      <div className="mt-3 text-sm text-slate-300">
        {subject.slots.length} slot{subject.slots.length !== 1 ? 's' : ''} detected
      </div>
    </button>
  );
}
