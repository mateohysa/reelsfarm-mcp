export function printJson(value: unknown): void {
  process.stdout.write(JSON.stringify(value, null, 2) + '\n');
}

export function printHuman(value: unknown): void {
  if (Array.isArray(value)) {
    console.table(value);
    return;
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const arrayKey = Object.keys(record).find((key) => Array.isArray(record[key]));
    if (arrayKey) {
      console.table(record[arrayKey] as unknown[]);
      const rest = { ...record };
      delete rest[arrayKey];
      if (Object.keys(rest).length > 0) console.log(rest);
      return;
    }
  }
  console.log(value);
}

export function output(value: unknown, json = false): void {
  if (json) printJson(value);
  else printHuman(value);
}
