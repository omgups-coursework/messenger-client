import {hashStringToInt} from "~/lib/hash-string-to-int";
import {hslToHex} from "~/lib/color/hsl-to-hex.util";

export function generatePastelColorFromIdentifier(identifier: string): string {
    const seed = hashStringToInt(identifier);

    const hue = seed % 360; // Цветовой тон от 0 до 359
    const saturation = 60 + (seed % 5); // 60–65%, чтобы не слишком бледный
    const lightness = 75 + (seed % 5);  // 75–80%, мягкий и светлый

    const hex = hslToHex(hue, saturation, lightness);

    return hex;
}
