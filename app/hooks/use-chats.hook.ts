import {useEventListener} from "~/hooks/use-event-listener.hook";
import {chatManager, type ChatManagerEventListenerListeners} from "~/managers/chat.manager";
import {useState} from "react";
import type {Chat} from "~/common/types";

export function useChats() {
    const [chats, setChats] = useState<Map<Chat['id'], Chat>>(new Map());

    useEventListener<ChatManagerEventListenerListeners, 'upsert'>(chatManager, 'upsert', (chats) => {
        setChats(prev => {
            const copy = new Map(prev);

            for (const chat of chats) {
                copy.set(chat.id, chat);
            }

            return copy;
        });
    })

    return {
        chats: chats,
    }
}