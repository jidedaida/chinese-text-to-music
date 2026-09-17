export function createRetryableLoader(load: () => Promise<void>): () => Promise<void> {
  let loaded = false;
  let pending: Promise<void> | null = null;
  return async () => {
    if (loaded) return;
    pending ??= load()
      .then(() => { loaded = true; })
      .catch((error) => {
        pending = null;
        throw error;
      });
    await pending;
  };
}
