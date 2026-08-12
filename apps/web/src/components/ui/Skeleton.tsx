export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="grid gap-2">
      {Array.from({ length: rows }, (_value, index) => (
        <div key={index} className="h-12 animate-pulse rounded-md bg-line-faint" />
      ))}
    </div>
  );
}

