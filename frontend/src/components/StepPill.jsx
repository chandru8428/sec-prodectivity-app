export default function StepPill({ index, title, active, completed }) {
  return (
    <div className={`rounded-full px-4 py-2 text-sm font-medium transition ${
      active
        ? 'bg-sky-400/20 text-sky-200 ring-1 ring-sky-300/30'
        : completed
          ? 'bg-emerald-400/15 text-emerald-200'
          : 'bg-white/5 text-slate-300'
    }`}>
      {index}. {title}
    </div>
  );
}
