export function generateDummyHistory(base: number, count: number, jitterPct = 0.05) {
  const arr = [] as number[];
  const step = base / (count + 1);
  for (let i = 0; i < count; i++) {
    const jitter = (Math.random() * 2 - 1) * base * jitterPct;
    arr.push(base - step * (count - i) + jitter);
  }
  return arr;
}

export function missingToNA(value: number | undefined | null): string {
  return value === undefined || value === null || Number.isNaN(value) ? 'N/A' : value.toString();
}
