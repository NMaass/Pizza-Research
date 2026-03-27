interface Props {
  fraction: number;
}

export function ProgressBar({ fraction }: Props) {
  const filledCount = Math.min(8, Math.max(0, Math.round(fraction * 8)));
  const size = 120;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 2;

  const slices: React.ReactNode[] = [];
  for (let i = 0; i < 8; i++) {
    const startAngle = (i * 360) / 8 - 90;
    const endAngle = ((i + 1) * 360) / 8 - 90;
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);

    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`;
    const filled = i < filledCount;

    slices.push(
      <path
        key={i}
        d={d}
        fill={filled ? "#d4a24e" : "#f5f0e8"}
        stroke="#fff"
        strokeWidth="1.5"
      />
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: "block" }}
    >
      {slices}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e8e0d0" strokeWidth="1" />
    </svg>
  );
}
