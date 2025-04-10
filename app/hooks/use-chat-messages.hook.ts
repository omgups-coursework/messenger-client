import type {Chat, Message} from "~/common/types";
import {useCallback, useEffect, useState} from "react";
import {useEventListener} from "~/hooks/use-event-listener.hook";
import {messageManager, type MessageManagerEventListenerListeners} from "~/managers/message.manager";

export const useChatMessages = (chatId: Chat['id']) => {
    const [messages, setMessages] = useState<Map<Message['id'], Message>>(new Map<Message['id'], Message>());

    const fetchMessages = useCallback(async () => {
        const messages = await messageManager.getByChatId(chatId);
        const map = new Map<Message['id'], Message>(messages.map((message) => [message.id, message]));

        setMessages(map);
    }, [chatId]);

    useEffect(() => {
        fetchMessages();
    }, [chatId]);

    useEventListener<MessageManagerEventListenerListeners, 'upsert'>(messageManager, 'upsert', (messages) => {
        console.log(`[useChatMessages] chatId=${chatId} handle upsert`, messages);

        setMessages(prev => {
            const copy = new Map(prev);

            for (const message of messages) {
                if (message.chatId !== chatId) {
                    continue;
                }

                copy.set(message.id, message);
            }

            return copy;
        });
    }, [chatId]);

    useEventListener<MessageManagerEventListenerListeners, 'delete'>(messageManager, 'delete', (data) => {
        if (data.chatId !== chatId) {
            return;
        }

        setMessages(prev => {
            const copy = new Map(prev);
            copy.delete(data.messageId);
            return copy;
        });
    }, [chatId])

    return {
        messages: messages,
    }
}