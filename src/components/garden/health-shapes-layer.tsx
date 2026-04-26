const RED = "#D63B26";
const BLUE = "#1E2A8E";
const YELLOW = "#F2C530";

function Triangle({
  size,
  color,
  rotate = 0,
}: {
  size: number;
  color: string;
  rotate?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ transform: `rotate(${rotate}deg)`, display: "block" }}
    >
      <polygon points="50,6 96,94 4,94" fill={color} />
    </svg>
  );
}

export function HealthShapesLayer() {
  return (
    <div
      aria-hidden
      className="hidden md:block absolute inset-0 pointer-events-none z-[5] overflow-hidden"
    >
      <div
        className="absolute"
        style={{ left: "calc(50% - 410px)", top: "1090px" }}
      >
        <div
          className="absolute rounded-full"
          style={{
            left: 0,
            top: "16px",
            width: "46px",
            height: "46px",
            background: BLUE,
          }}
        />
        <div
          className="absolute"
          style={{
            left: "20px",
            top: 0,
            width: "44px",
            height: "44px",
            background: RED,
            transform: "rotate(8deg)",
          }}
        />
        <div
          className="absolute"
          style={{
            left: "14px",
            top: "46px",
            transform: "rotate(-4deg)",
          }}
        >
          <Triangle size={42} color={YELLOW} />
        </div>
      </div>
    </div>
  );
}
