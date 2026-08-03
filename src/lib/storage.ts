export function readBooleanPreference(key: string, fallback = false): boolean {
    try {
        const value = localStorage.getItem(key);
        return value === null ? fallback : value === 'true';
    } catch {
        return fallback;
    }
}

export function writePreference(key: string, value: string): boolean {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch {
        return false;
    }
}
