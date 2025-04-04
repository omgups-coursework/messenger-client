export interface IVector2 {
    x: number;
    y: number;
}

export class Vector2 implements IVector2 {
    constructor(
        public x = 0,
        public y = 0,
    ) {}

    static distanceSqr(v1: IVector2, v2: IVector2): number {
        const dx = v1.x - v2.x;
        const dy = v1.y - v2.y;

        return dx * dx + dy * dy;
    }

}