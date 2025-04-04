import type {Chat} from "~/common/types";
import {getAll} from "~/helpers/idbd/get-all";
import {add} from "~/helpers/idbd/add";

export class ChatStore {
    private dbName = "messenger_chats";
    private storeName = "chats";
    private indexName = "chatId_timestamp";

    private getDB(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);

            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: "id" });
                }
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    public async getChats(): Promise<Chat[]> {
        const messengerDatabase = await this.getDB();
        const transaction = messengerDatabase.transaction(this.storeName, 'readwrite');
        const chatStore = transaction.objectStore(this.storeName);
        const chats = await getAll<Chat>(chatStore);
        transaction.commit();
        messengerDatabase.close();

        return chats;
    }

    public async add(chat: Chat): Promise<Chat['id']> {
        const messengerDatabase = await this.getDB();
        const transaction = messengerDatabase.transaction(this.storeName, 'readwrite');
        const chatStore = transaction.objectStore(this.storeName);

        const id = await add<Chat>(chatStore, chat);

        transaction.commit();
        messengerDatabase.close();

        return id as Chat['id'];
    }

    public async get(id: Chat['id']): Promise<Chat | null> {
        const db = await this.getDB();
        const tx = db.transaction(this.storeName, "readonly");
        const store = tx.objectStore(this.storeName);

        return new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result ?? null);
            request.onerror = () => reject(request.error);
        });

    }
}

export const chatStore = new ChatStore();
