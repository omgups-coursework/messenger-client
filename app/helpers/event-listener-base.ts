type ArgumentTypes<T> = T extends (...args: infer A) => any ? A : never;
type SuperReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

type ListenerOptions = AddEventListenerOptions;

export type EventListenerListeners = Record<string, (...args: any[]) => any>;

type ListenerObject<T> = { callback: T; options?: ListenerOptions };

export class EventListenerBase<Listeners extends EventListenerListeners> {
    protected listeners: Partial<{
        [K in keyof Listeners]: Set<ListenerObject<Listeners[K]>>;
    }> = {};

    protected listenerResults: Partial<{
        [K in keyof Listeners]: ArgumentTypes<Listeners[K]>;
    }> = {};

    private readonly reuseResults: boolean;

    public constructor(reuseResults = false) {
        this.reuseResults = reuseResults;
    }

    public addEventListener<K extends keyof Listeners>(
        name: K,
        callback: Listeners[K],
        options?: ListenerOptions
    ): void {
        const listenerObject: ListenerObject<Listeners[K]> = {callback, options};

        (this.listeners[name] ??= new Set()).add(listenerObject);

        if (this.listenerResults.hasOwnProperty(name)) {
            callback(...this.listenerResults[name]!);

            if ((options as AddEventListenerOptions)?.once) {
                this.listeners[name]!.delete(listenerObject);
            }
        }
    }

    public once<K extends keyof Listeners>(
        name: K,
        callback: Listeners[K]
    ): void {
        this.addEventListener(name, callback, {once: true});
    }

    public removeEventListener<K extends keyof Listeners>(
        name: K,
        callback: Listeners[K]
    ): void {
        const listenerSet = this.listeners[name];

        if (!listenerSet) {
            return;
        }

        for (const listener of listenerSet) {
            if (listener.callback === callback) {
                listenerSet.delete(listener);
                break;
            }
        }
    }

    public hasListeners<K extends keyof Listeners>(name: K): boolean {
        return !!this.listeners[name]?.size;
    }

    public dispatchEvent<K extends keyof Listeners>(
        name: K,
        ...args: ArgumentTypes<Listeners[K]>
    ): void {
        if (this.reuseResults) {
            this.listenerResults[name] = args;
        }

        const listeners = this.listeners[name];

        if (!listeners) {
            return;
        }

        for (const listener of listeners) {
            try {
                listener.callback(...args);
            } catch (err) {
                console.error(`Error in listener for event "${String(name)}":`, err);
            }

            if ((listener.options as AddEventListenerOptions)?.once) {
                listeners.delete(listener);
            }
        }
    }

    public dispatchResultableEvent<K extends keyof Listeners>(
        name: K,
        ...args: ArgumentTypes<Listeners[K]>
    ): Array<SuperReturnType<Listeners[K]>> {
        if (this.reuseResults) {
            this.listenerResults[name] = args;
        }

        const listeners = this.listeners[name];
        const results: Array<SuperReturnType<Listeners[K]>> = [];
        if (!listeners) {
            return results;
        }

        for (const listener of listeners) {
            try {
                const result = listener.callback(...args);
                results.push(result);
            } catch (err) {
                console.error(`Error in listener for event "${String(name)}":`, err);
            }

            if ((listener.options as AddEventListenerOptions)?.once) {
                listeners.delete(listener);
            }
        }

        return results;
    }

    public cleanup(): void {
        this.listeners = {};
        this.listenerResults = {};
    }
}
