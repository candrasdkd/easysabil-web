export function getErrorMessage(error: unknown, fallback = 'Terjadi kesalahan'): string {
    if (error instanceof Error && error.message) return error.message;
    if (typeof error === 'string' && error.trim()) return error;

    if (typeof error === 'object' && error !== null && 'message' in error) {
        const message = Reflect.get(error, 'message');
        if (typeof message === 'string' && message.trim()) return message;
    }

    return fallback;
}

export function getErrorCode(error: unknown): string | null {
    if (typeof error !== 'object' || error === null || !('code' in error)) return null;
    const code = Reflect.get(error, 'code');
    return typeof code === 'string' ? code : null;
}
