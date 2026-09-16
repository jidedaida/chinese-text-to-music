export async function sha256Bytes(input: string): Promise<Uint8Array> {
  const data = new TextEncoder().encode(input);
  return new Uint8Array(await crypto.subtle.digest('SHA-256', data));
}

export async function sha256Hex(input: string): Promise<string> {
  const bytes = await sha256Bytes(input);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}
