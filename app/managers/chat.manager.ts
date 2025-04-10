import {EventListenerBase, type EventListenerListeners} from "~/helpers/event-listener-base";
import type {Chat, ChatPreview} from "~/common/types";
import {ChatStore, chatStore} from "~/database/chat.store";


export interface ChatManagerEventListenerListeners extends EventListenerListeners {
    'upsert': (data: Chat[]) => void
}

export class ChatManager extends EventListenerBase<ChatManagerEventListenerListeners> {
    private chats = new Map<Chat['id'], Chat>();

    public constructor(
        private readonly chatStore: ChatStore,
    ) {
        super(true);
    }

    public async initialize(): Promise<void> {
        const chats = await this.chatStore.getChats();

        for (const chat of chats) {
            this.chats.set(chat.id, chat);
        }

        this.dispatchEvent('upsert', chats);
    }

    public get(chatId: Chat['id']): Chat | null {
        const cachedChat = this.chats.get(chatId);

        if (cachedChat) {
            return cachedChat;
        }

        return null
    }

    public async add(chat: Chat): Promise<Chat['id']> {
        const id = await this.chatStore.add(chat);

        this.chats.set(chat.id, chat);
        this.dispatchEvent('upsert', [chat]);

        return id as Chat['id'];
    }
}

export interface ChatPreviewManagerEventListenerListeners extends EventListenerListeners {
    'upsert': (data: ChatPreview[]) => void
}

export const chatManager = new ChatManager(chatStore);
