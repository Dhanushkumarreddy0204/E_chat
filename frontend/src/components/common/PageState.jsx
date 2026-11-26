export function PageState({ icon: Icon, title, description, action, onAction }) {
  return (
    <div className="state-panel">
      {Icon && <span className="state-symbol"><Icon size={22} strokeWidth={1.8} /></span>}
      <h2 className="section-title">{title}</h2>
      {description && <p className="max-w-sm text-sm leading-relaxed text-text-secondary">{description}</p>}
      {action && <button type="button" className="pill-button secondary-button mt-1" onClick={onAction}>{action}</button>}
    </div>
  );
}

export function PageSkeleton({ label = 'Loading', media = false }) {
  return (
    <div className="panel space-y-4 p-5" role="status" aria-label={label}>
      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="skeleton h-10 w-10 !rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-3 w-2/5" />
          <div className="skeleton h-2.5 w-1/4" />
        </div>
      </div>
      <div aria-hidden="true" className={`skeleton w-full ${media ? 'h-48' : 'h-4'}`} />
    </div>
  );
}
