export function neverTypeGuard(value: never) {
    throw new TypeError('never type guard');
}