import {EventListenerBase} from "~/helpers/event-listener-base";
import type {Chat, ChatPreview, Message} from "~/common/types";
import {type DeleteMessageData, messageManager, MessageManager} from "~/managers/message.manager";
import {chatManager, ChatManager, type ChatPreviewManagerEventListenerListeners} from "~/managers/chat.manager";
import {MessageStore, messageStore} from "~/database/message.store";

export class ChatPreviewManager extends EventListenerBase<ChatPreviewManagerEventListenerListeners> {
    private chatsPreview = new Map<ChatPreview['id'], ChatPreview>();

    public constructor(
        private readonly chatManager: ChatManager,
        private readonly messageStore: MessageStore,
        private readonly messageManager: MessageManager,
    ) {
        super(true);

        this.chatManager.addEventListener('upsert', this.handleChatUpsert);
        this.messageManager.addEventListener('upsert-last-message', this.handleUpsertLastMessage);
        this.messageManager.addEventListener('delete', this.handleDeleteMessage);
    }

    private handleChatUpsert = async (chats: Chat[]) => {
        const toUpsert: ChatPreview[] = [];

        await Promise.all(chats.map(async (chat) => {
            const chatPreview = this.chatsPreview.get(chat.id);

            if (chatPreview != null) {
                const newChatPreview: ChatPreview = {
                    ...chatPreview,
                    title: chat.title,
                    upsertTimestamp: Date.now(),
                }

                toUpsert.push(chatPreview);

                this.chatsPreview.set(chat.id, newChatPreview);

                return;
            }

            const lastMessage = await this.messageStore.getLast(chat.id);

            const newChatPreview: ChatPreview = {
                id: chat.id,
                title: chat.title,
                upsertTimestamp: Date.now(),
                message: lastMessage,
            }

            toUpsert.push(newChatPreview);

            this.chatsPreview.set(chat.id, newChatPreview);
        }))

        this.dispatchEvent('upsert', toUpsert);
    }

    private handleUpsertLastMessage = async (message: Message) => {
        const chatPreview = this.chatsPreview.get(message.chatId);

        if (chatPreview == null) {
            const chat = this.chatManager.get(message.chatId);

            if (chat === null) {
                return;
            }

            const newChatPreview: ChatPreview = {
                id: chat.id,
                title: chat.title,
                upsertTimestamp: Date.now(),
                message: message,
            }

            this.chatsPreview.set(newChatPreview.id, newChatPreview);

            this.dispatchEvent('upsert', [newChatPreview]);

            return;
        }

        const newChatPreview: ChatPreview = {
            ...chatPreview,
            upsertTimestamp: Date.now(),
            message: message,
        }

        this.chatsPreview.set(newChatPreview.id, newChatPreview);

        this.dispatchEvent('upsert', [newChatPreview]);

    }

    private handleDeleteMessage = async (data: DeleteMessageData) => {
        const chat = this.chatManager.get(data.chatId);

        if (chat === null) {
            return;
        }

        const chatPreview = this.chatsPreview.get(data.chatId);

        if (chatPreview == null) {
            return;
        }

        if (chatPreview.message === null) {
            return;
        }

        if (chatPreview.message.id === data.messageId) {
            const lastMessage = await this.messageStore.getLast(data.chatId);

            const newChatPreview: ChatPreview = {
                id: chat.id,
                title: chat.title,
                upsertTimestamp: Date.now(),
                message: lastMessage,
            }

            this.dispatchEvent('upsert', [newChatPreview]);
        }
    }
}

export const chatPreviewManager = new ChatPreviewManager(chatManager, messageStore, messageManager);