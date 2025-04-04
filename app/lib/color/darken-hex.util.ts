export function darkenHex(hex: string, amount = 0.15): string {
    const num = parseInt(hex.replace("#", ""), 16);

    let r = (num >> 16) & 0xff;
    let g = (num >> 8) & 0xff;
    let b = num & 0xff;

    r = Math.max(0, Math.min(255, Math.floor(r * (1 - amount))));
    g = Math.max(0, Math.min(255, Math.floor(g * (1 - amount))));
    b = Math.max(0, Math.min(255, Math.floor(b * (1 - amount))));

    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
