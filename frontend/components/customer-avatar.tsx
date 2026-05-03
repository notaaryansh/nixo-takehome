const palette = [
  "#B6E3F4",
  "#C0AEDE",
  "#FFE0B2",
  "#C0F0E8",
  "#FFD5DC",
  "#E8D5F5",
];

const colorFor = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
};

export function CustomerAvatar({
  id,
  name,
  size = 24,
}: {
  id: string;
  name: string;
  size?: number;
}) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-md font-medium text-[#1B1F23]"
      style={{
        width: size,
        height: size,
        background: colorFor(id),
        fontSize: Math.max(9, Math.floor(size * 0.42)),
      }}
    >
      {initials}
    </span>
  );
}
