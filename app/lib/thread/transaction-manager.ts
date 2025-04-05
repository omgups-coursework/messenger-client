import { Mutex, type MutexUnlockCallback } from './mutex';

export type TransactionFn<T> = () => Promise<T> | T;
export type RollbackFn<T> = () => Promise<T> | T;

export type PreInit<Data> = () => Promise<Data> | Data;
export type TransactionFn2<Data, Result> = (data: Data) => Promise<Result> | Result;
export type RollbackFn2<Data, Result> = (data: Data) => Promise<Result> | Result;

export class TransactionManagerInitError extends Error {
  public constructor(public readonly error: unknown) {
    super();
  }
}

export class TransactionManager {
  private locks = new Map<string, Mutex>();

  public async transaction<Data, Result>(
    ids: string[],
    initFn: PreInit<Data>,
    transactionFn: TransactionFn2<Data, Result>,
    rollbackFn: RollbackFn2<Data, Result>,
  ): Promise<Result> {
    // Избавляемся от дублей
    const uniqueIds = new Set(ids);

    // Сортируем во избежания дедлока (https://www.ibm.com/docs/en/wxs/8.6.1?topic=overview-deadlocks)
    const uniqueSortedIds = Array.from(uniqueIds).sort();

    const unlocks: MutexUnlockCallback[] = [];
    let data: Data | null = null;

    try {
      for (const id of uniqueSortedIds) {
        let mutex = this.locks.get(id);

        if (!mutex) {
          mutex = new Mutex(id);
          mutex.onIdle((m) => {
            const current = this.locks.get(m.resourceId);

            if (current === m) {
              this.locks.delete(m.resourceId);
            }
          });

          this.locks.set(id, mutex);
        }

        const unlock = await mutex.lock();
        unlocks.push(unlock);
      }

      try {
        data = await initFn();
      } catch (error) {
        throw new TransactionManagerInitError(error);
      }

      const result = await transactionFn(data);

      return result;
    } catch (error) {
      try {
        if (data === null) {
          const error = new Error('Transaction manager internal init failed');

          throw new TransactionManagerInitError(error);
        }

        await rollbackFn(data);
      } catch (rollbackError) {
        console.error(`Rollback error: ${rollbackError}`);
      }

      throw error;
    } finally {
      await Promise.all(unlocks.map((unlock) => unlock()));
    }
  }
}
