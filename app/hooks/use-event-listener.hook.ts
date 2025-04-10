import React, { useEffect } from "react";
import {EventListenerBase, type EventListenerListeners} from "~/helpers/event-listener-base";

export function useEventListener<
    Listeners extends EventListenerListeners,
    T extends keyof Listeners
>(
    eventBus: EventListenerBase<Listeners> | null,
    name: T,
    callback: Listeners[T],
    deps?: React.DependencyList,
) {
    useEffect(() => {
        if (eventBus == null) {
            return;
        }

        eventBus.addEventListener(name, callback);

        return () => {
            eventBus.removeEventListener(name, callback);
        };

    }, deps ? deps.concat(eventBus) : [eventBus]);
}
