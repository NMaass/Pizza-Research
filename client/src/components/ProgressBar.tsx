interface Props {
  fraction: number;
}

export function ProgressBar({ fraction }: Props) {
  return (
    <div style={{
      width: "100%",
      maxWidth: "400px",
      height: "3px",
      background: "#eee",
      borderRadius: "1.5px",
    }}>
      <div style={{
        width: `${Math.min(fraction * 100, 100)}%`,
        height: "100%",
        background: "#111",
        borderRadius: "1.5px",
        transition: "width 0.3s ease",
      }} />
    </div>
  );
}
