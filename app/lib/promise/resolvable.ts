export class Resolvable<T> {
    public readonly promise: Promise<T>;
    private resolveCallback: (value: T) => void;
    private rejectCallback: (reason?: any) => void;

    public constructor() {
        this.promise = new Promise<T>((resolve, reject) => {
            this.resolveCallback = resolve;
            this.rejectCallback = reject;
        })
    }

    public resolve(value: T): void {
        this.resolveCallback(value);
    }

    public reject(reason?: any): void {
        this.rejectCallback(reason);
    }
}