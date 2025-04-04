import {useEventListener} from "~/hooks/use-event-listener.hook";
import {
    type ChatPreviewManagerEventListenerListeners
} from "~/managers/chat.manager";
import {useState} from "react";
import type {ChatPreview} from "~/common/types";
import {chatPreviewManager} from "~/managers/chat-preview-manager";

export function useChatsPreview() {
    const [chatsPreview, setChatsPreview] = useState<Map<ChatPreview['id'], ChatPreview>>(new Map());

    useEventListener<ChatPreviewManagerEventListenerListeners, 'upsert'>(chatPreviewManager, 'upsert', (items) => {
        setChatsPreview(prev => {
            const copy = new Map(prev);

            for (const item of items) {
                copy.set(item.id, item);
            }

            return copy;
        });
    })

    return {
        chatsPreview: chatsPreview,
    }
}