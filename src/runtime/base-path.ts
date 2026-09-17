export function withBasePath(
  relativePath: string,
  basePath: string = import.meta.env.BASE_URL,
): string {
  const normalizedBase = basePath.endsWith('/') ? basePath : `${basePath}/`;
  return `${normalizedBase}${relativePath.replace(/^\/+/, '')}`;
}
