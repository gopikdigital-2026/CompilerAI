export function DemoBadge({ label = 'Demo' }: { label?: string }) {
  return (
    <span
      data-testid="demo-badge"
      className="inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded border bg-warning-500/10 text-warning-400 border-warning-500/20"
      title="Esta sección muestra datos de demostración"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-warning-400" />
      {label}
    </span>
  );
}
