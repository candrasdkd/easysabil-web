export const CACHE_TTL = {
    short: 5 * 60 * 1000,
    standard: 10 * 60 * 1000,
} as const;

export function isCacheFresh(lastFetchedAt: number | null, ttlMs: number): boolean {
    return lastFetchedAt !== null && Date.now() - lastFetchedAt < ttlMs;
}
