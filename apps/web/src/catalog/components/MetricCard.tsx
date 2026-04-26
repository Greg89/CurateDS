export function MetricCard({
  label,
  value
}: Readonly<{
  label: string;
  value: string;
}>) {
  return (
    <article className="metric-card">
      <p className="eyebrow subtle">{label}</p>
      <h3>{value}</h3>
    </article>
  );
}
