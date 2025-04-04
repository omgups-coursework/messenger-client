import {chatManager} from "~/managers/chat.manager";
import {useEffect, useState} from "react";
import type {Chat} from "~/common/types";

export function useChat(chatId: Chat['id']) {
    const [chat, setChat] = useState<Chat | null>(null);

    useEffect(() => {
        setChat(chatManager.get(chatId));
    }, [chatId])


    return {
        chat: chat,
    }
}