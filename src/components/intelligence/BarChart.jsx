export default function BarChart({ data, valueKey, labelKey, unit = '', color = 'var(--color-primary)' }) {
  const max = Math.max(...data.map((d) => d[valueKey] || 0), 1);

  if (data.length === 0) {
    return <p className="intel-empty">Sin datos</p>;
  }

  return (
    <div className="bar-chart">
      {data.map((item) => {
        const value = item[valueKey] || 0;
        const pct = Math.round((value / max) * 100);
        return (
          <div key={item[labelKey]} className="bar-chart__row">
            <span className="bar-chart__label" title={item[labelKey]}>
              {item[labelKey]}
            </span>
            <div className="bar-chart__track">
              <div
                className="bar-chart__fill"
                style={{ width: `${pct}%`, background: color }}
              />
            </div>
            <span className="bar-chart__value">
              {value.toLocaleString('es-PY')}{unit}
            </span>
          </div>
        );
      })}
    </div>
  );
}
