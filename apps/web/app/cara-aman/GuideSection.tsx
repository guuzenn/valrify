export function GuideSection({ id, number, label, title, description, children, priority = false, optional = false }: { id: string; number: string; label: string; title: string; description: string; children: React.ReactNode; priority?: boolean; optional?: boolean }) {
  return <section className={`safety-section${priority ? " priority" : ""}${optional ? " optional" : ""}`} id={id}>
    <div className="safety-section-heading"><p className="panel-index">{number} / {label}</p><h2>{title}</h2><p>{description}</p></div>
    {children}
  </section>;
}
