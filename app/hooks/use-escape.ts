import { useEffect, useRef } from "react";

declare global {
    interface Window {
        __escapeListenerInstalled?: boolean;
    }
}

type EscapeHandler = {
    id: number;
    priority: number;
    callback: () => void;
};

type EscapePriority = number | { aboveCurrent: number };

const escapeHandlers: EscapeHandler[] = [];
let nextEscapeHandlerId = 0;

function addEscapeHandler(handler: EscapeHandler) {
    escapeHandlers.push(handler);
}

function removeEscapeHandler(id: number) {
    const index = escapeHandlers.findIndex(handler => handler.id === id);

    if (index !== -1) {
        escapeHandlers.splice(index, 1);
    }
}

function calculateHighestPriority(): number {
    let highestPriority = 0;

    for (const escapeHandler of escapeHandlers) {
        if (escapeHandler.priority > highestPriority) {
            highestPriority = escapeHandler.priority;
        }
    }

    return highestPriority;
}

function handleKeyDown(event: KeyboardEvent): void {
    if (event.key !== "Escape") {
        return;
    }

    if (escapeHandlers.length === 0) {
        return;
    }

    const highestPriority = calculateHighestPriority()

    for (const escapeHandler of escapeHandlers) {
        if (escapeHandler.priority !== highestPriority) {
            continue;
        }

        escapeHandler.callback();
    }
}

if (typeof window !== "undefined" && !window.__escapeListenerInstalled) {
    document.addEventListener("keydown", handleKeyDown);
    window.__escapeListenerInstalled = true;
}

export function useEscape(callback: () => void | Promise<void>, priority: EscapePriority = 0, enabled: boolean = true) {
    const handlerIdRef = useRef<number | null>(null);

    useEffect(() => {
        if (!enabled) {
            return;
        }

        let finalPriority: number;

        if (typeof priority === "number") {
            finalPriority = priority;
        } else {
            const highestPriority = calculateHighestPriority()
            finalPriority = highestPriority + priority.aboveCurrent;
        }

        const id = nextEscapeHandlerId++;

        handlerIdRef.current = id;

        addEscapeHandler({ id, priority: finalPriority, callback });

        return () => {
            removeEscapeHandler(id);
        };
    }, [callback, priority, enabled]);
}
