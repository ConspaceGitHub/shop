interface LineChartPoint {
  label: string;
  value: number;
}

interface LineChartProps {
  data: LineChartPoint[];
  height?: number;
  formatValue?: (value: number) => string;
}

function LineChart({ data, height = 160, formatValue = (v) => `${v}` }: LineChartProps) {
  const width = 100;
  const max = Math.max(1, ...data.map((d) => d.value));
  const padTop = 10;
  const plotHeight = height - padTop - 4;

  const points = data.map((d, i) => {
    const x = data.length > 1 ? (i / (data.length - 1)) * width : width / 2;
    const y = padTop + plotHeight - (d.value / max) * plotHeight;
    return { x, y, ...d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`
      : '';

  // 標籤太多的話只挑頭、中、尾，避免擠成一團
  const showAllLabels = data.length <= 6;
  const labelIndexes = showAllLabels
    ? data.map((_, i) => i)
    : Array.from(new Set([0, Math.floor((data.length - 1) / 2), data.length - 1]));

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="h-40 w-full overflow-visible">
        <line
          x1="0"
          y1={height - 0.5}
          x2={width}
          y2={height - 0.5}
          stroke="var(--color-forest-100)"
          strokeWidth="0.5"
        />
        {areaPath && <path d={areaPath} fill="var(--color-forest-200)" opacity="0.35" />}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke="var(--color-forest-600)"
            strokeWidth="1.6"
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="1.8" fill="var(--color-forest-700)">
            <title>
              {p.label}：{formatValue(p.value)}
            </title>
          </circle>
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-forest-400">
        {data.map((d, i) => (
          <span key={i} className={labelIndexes.includes(i) ? '' : 'invisible'}>
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default LineChart;
