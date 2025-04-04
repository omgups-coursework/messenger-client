export function hashStringToInt(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0; // Приводим к 32-битному int
    }

    const hashInt = Math.abs(hash);

    return hashInt;
}
