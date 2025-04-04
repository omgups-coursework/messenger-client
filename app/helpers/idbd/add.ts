export function add<T>(store: IDBObjectStore, value: T, key?: IDBValidKey): Promise<IDBValidKey> {
    return new Promise<IDBValidKey>((resolve, reject) => {
        const request = store.add(value, key)

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);

    });

}