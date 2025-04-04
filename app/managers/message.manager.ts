import type {Chat, Message} from "~/common/types";
import {EventListenerBase, type EventListenerListeners} from "~/helpers/event-listener-base";
import {messageStore, type MessageStore} from "~/database/message.store";


export interface MessageManagerEventListenerListeners extends EventListenerListeners {
    'upsert-last-message': (data: Message) => void;
    'upsert': (data: Message[]) => void;
}

export class MessageManager extends EventListenerBase<MessageManagerEventListenerListeners> {
    private messages = new Map<Message['chatId'], Map<Message['id'], Message>>()

    public constructor(
        private readonly messageStore: MessageStore,
    ) {
        super(true);
    }

    public async add(message: Message): Promise<void> {
        await this.messageStore.add(message);

        const chatMessages = this.messages.get(message.chatId) ?? new Map<Message["id"], Message>();
        chatMessages.set(message.id, message);
        this.messages.set(message.chatId, chatMessages);
        this.dispatchEvent('upsert-last-message', message);
        this.dispatchEvent('upsert', [message]);
    }

    public async getByChatId(chatId: Chat['id']): Promise<Message[]> {
        const cachedMessages = this.messages.get(chatId);

        if (cachedMessages != null) {
            return [...cachedMessages.values()];
        }

        const messages = await messageStore.getByChatId(chatId);
        this.messages.set(chatId, new Map(messages.map((message) => [message.id, message])));

        this.dispatchEvent('upsert', messages);

        return messages;
    }

    public get(chatId: Chat['id'], messageId: Message['id']): Message | null {
        const messages = this.messages.get(chatId);

        if (messages == null) {
            return null;
        }

        const message = messages.get(messageId);

        if (message == null) {
            return null;
        }

        return message;
    }
}

export const messageManager = new MessageManager(messageStore);
