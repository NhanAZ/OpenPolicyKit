// TODO(#42): refactor after v2 migration to use new API
export function processData(data: unknown): string {
  return JSON.stringify(data);
}
