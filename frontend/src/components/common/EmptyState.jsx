export default function EmptyState({ icon = '📭', title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
      <div className="text-5xl mb-4 opacity-60">{icon}</div>
      <h3 className="font-display text-lg font-semibold text-slate-300 mb-2">{title}</h3>
      {description && <p className="text-sm text-slate-500 max-w-xs mb-6">{description}</p>}
      {action}
    </div>
  );
}
