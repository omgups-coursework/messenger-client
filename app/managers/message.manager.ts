import {
    type Chat,
    type Message,
    type MessageBase,
    type OutgoingMessage,
    OutgoingMessageStatusEnum
} from "~/common/types";
import {EventListenerBase, type EventListenerListeners} from "~/helpers/event-listener-base";
import {messageStore, type MessageStore} from "~/database/message.store";
import {chatConnectionManager} from "~/managers/chat-connection.manager";

export interface DeleteMessageData {
    chatId: Chat['id'];
    messageId: Message['id'];
}

export interface MessageManagerEventListenerListeners extends EventListenerListeners {
    'upsert-last-message': (data: Message) => void;
    'upsert': (data: Message[]) => void;
    'delete': (data: DeleteMessageData) => void;
}

export class MessageManager extends EventListenerBase<MessageManagerEventListenerListeners> {
    private messages = new Map<Message['chatId'], Map<Message['id'], Message>>()
    private lastMessage = new Map<Message['chatId'], Message['id']>()

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

        this.lastMessage.set(message.chatId, message.id);
    }

    public async update(message: Message): Promise<void> {
        await this.messageStore.update(message);

        const chatMessages = this.messages.get(message.chatId) ?? new Map<Message["id"], Message>();
        chatMessages.set(message.id, message);
        this.messages.set(message.chatId, chatMessages);
        this.dispatchEvent('upsert', [message]);

        const lastMessageId = this.lastMessage.get(message.chatId);
        if (lastMessageId == null || lastMessageId === message.id) {
            this.dispatchEvent('upsert-last-message', message);
        }
    }

    public async delete(chatId: Chat['id'], messageId: Message['id'], sync = true): Promise<void> {
        await this.messageStore.delete(chatId, messageId);

        const chatMessages = this.messages.get(chatId);

        if (chatMessages == null) {
            return;
        }

        chatMessages.delete(messageId);

        this.dispatchEvent('delete', { chatId: chatId, messageId: messageId });

        if (sync) {
            const connection = chatConnectionManager.getConnection(chatId);

            if (connection) {
                connection.deleteMessage(messageId);
            }
        }
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

    public async send(chatId: Chat['id'], message: MessageBase): Promise<void> {
        const connection = chatConnectionManager.getConnection(chatId);

        if (!connection || (connection && !connection.isOpen())) {
            const outgoingMessage: OutgoingMessage = {
                ...message,
                fromMe: true,
                status: OutgoingMessageStatusEnum.CLOCK,
                readTimestamp: null,
            }

            await this.add(outgoingMessage);
            return
        }

        const outgoingMessage: OutgoingMessage = {
            ...message,
            fromMe: true,
            status: OutgoingMessageStatusEnum.SENT,
            readTimestamp: null,
        }

        await this.add(outgoingMessage);

        const ack = await connection.sendPendingMessage({
            id: message.id,
            message: message,
        });

        outgoingMessage.status = OutgoingMessageStatusEnum.RECEIVED;

        await this.update(outgoingMessage);
    }

    public async readMessage(chatId: Chat['id'], messageId: Message['id']): Promise<void> {
        const connection = chatConnectionManager.getConnection(chatId);

        if (connection === null) {
            // offline

            return;
        }

        const message = this.get(chatId, messageId);

        if (message === null) {
            return;
        }

        if (message.readTimestamp !== null) {
            return;
        }

        const timestamp = Date.now();

        connection.sendRead(chatId, messageId, timestamp);

        message.readTimestamp = timestamp;

        await this.update(message);
    }
}

export const messageManager = new MessageManager(messageStore);
