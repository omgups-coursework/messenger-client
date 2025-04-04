import React from "react";
import type {Chat, Message} from "~/common/types";

export interface ChatContextData {
    chat: Chat;
    isSelecting: boolean;
    selectedMessages: Set<Message['id']>;
    setSelectedMessages: (value: Set<Message['id']>) => void;
    selectMessage(messageId: Message['id']): void;
    deselectMessage(messageId: Message['id']): void;
    selectedMessageId: Message['id'] | null;
}

export const ChatContext = React.createContext<ChatContextData>(null as unknown as ChatContextData);