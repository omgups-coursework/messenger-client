export function getAll<T>(store: IDBObjectStore, query?: IDBValidKey | IDBKeyRange | null, count?: number): Promise<T[]> {
    return new Promise<T[]>((resolve, reject) => {
        const request = store.getAll(query, count)

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);

    });

}