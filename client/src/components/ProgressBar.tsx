interface Props {
  fraction: number;
}

export function ProgressBar({ fraction }: Props) {
  const filledCount = Math.min(8, Math.max(0, Math.round(fraction * 8)));
  const size = 120;
  const center = size / 2;
  const radius = size / 2 - 2;
  const slices: React.ReactNode[] = [];

  for (let index = 0; index < 8; index += 1) {
    const startRadians = (((index * 360) / 8 - 90) * Math.PI) / 180;
    const endRadians = ((((index + 1) * 360) / 8 - 90) * Math.PI) / 180;
    const x1 = center + radius * Math.cos(startRadians);
    const y1 = center + radius * Math.sin(startRadians);
    const x2 = center + radius * Math.cos(endRadians);
    const y2 = center + radius * Math.sin(endRadians);
    const path = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;

    slices.push(
      <path
        key={index}
        d={path}
        fill={index < filledCount ? "#d4a24e" : "#f5f0e8"}
        stroke="#fff"
        strokeWidth="1.5"
      />,
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: "block" }}
      role="img"
      aria-label={`${Math.round(Math.max(0, Math.min(1, fraction)) * 100)} percent complete`}
    >
      {slices}
      <circle cx={center} cy={center} r={radius} fill="none" stroke="#e8e0d0" strokeWidth="1" />
    </svg>
  );
}
