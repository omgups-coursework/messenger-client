import type { Chat, Message } from "~/common/types";

export class MessageStore {
    private dbName = "messenger_messages";
    private storeName = "messages";
    private indexName = "chatId_timestamp";

    private getDB(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);

            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    // Создаём хранилище с составным ключом: [chatId, id]
                    const store = db.createObjectStore(this.storeName, { keyPath: ["chatId", "id"] });
                    store.createIndex("chatId", "chatId", { unique: false });
                    store.createIndex("senderId", "senderId", { unique: false });
                    store.createIndex("chatId_timestamp", ["chatId", "timestamp"], { unique: false });
                }
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    public async getByChatId(chatId: string): Promise<Message[]> {
        const db = await this.getDB();
        const tx = db.transaction(this.storeName, "readonly");
        const store = tx.objectStore(this.storeName);
        const index = store.index(this.indexName);

        const range = IDBKeyRange.bound([chatId, 0], [chatId, Number.MAX_SAFE_INTEGER]);
        const request = index.openCursor(range);
        const messages: Message[] = [];

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                const cursor = request.result;
                if (cursor) {
                    messages.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(messages);
                }
            };
            request.onerror = () => reject(request.error);
        });
    }

    public async getByIndex(chatId: string, index: number): Promise<Message | null> {
        const messages = await this.getByChatId(chatId);
        return messages[index] ?? null;
    }

    public async getLast(chatId: string): Promise<Message | null> {
        const db = await this.getDB();
        const tx = db.transaction(this.storeName, "readonly");
        const store = tx.objectStore(this.storeName);
        const index = store.index(this.indexName);

        const range = IDBKeyRange.bound([chatId, 0], [chatId, Number.MAX_SAFE_INTEGER]);
        const request = index.openCursor(range, "prev");

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                const cursor = request.result;
                resolve(cursor ? cursor.value : null);
            };
            request.onerror = () => reject(request.error);
        });
    }

    public async add(data: Message): Promise<void> {
        const db = await this.getDB();
        const tx = db.transaction(this.storeName, "readwrite");
        const store = tx.objectStore(this.storeName);
        await new Promise((resolve, reject) => {
            const req = store.add(data);
            req.onsuccess = () => resolve(undefined);
            req.onerror = () => reject(req.error);
        });
    }

    public async update(data: Message): Promise<void> {
        const db = await this.getDB();
        const tx = db.transaction(this.storeName, "readwrite");
        const store = tx.objectStore(this.storeName);
        await new Promise((resolve, reject) => {
            const req = store.put(data);
            req.onsuccess = () => resolve(undefined);
            req.onerror = () => reject(req.error);
        });
    }

    // Теперь удаление происходит по составному ключу [chatId, messageId]
    public async delete(chatId: Chat['id'], messageId: Message['id']): Promise<void> {
        const db = await this.getDB();
        const tx = db.transaction(this.storeName, "readwrite");
        const store = tx.objectStore(this.storeName);

        await new Promise((resolve, reject) => {
            const req = store.delete([chatId, messageId]);
            req.onsuccess = () => resolve(undefined);
            req.onerror = () => reject(req.error);
        });
    }
}

export const messageStore = new MessageStore();
