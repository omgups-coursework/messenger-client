import {AbortControllerPolyfill, type AbortSignalPolyfill} from "~/lib/thread/abort-controller";

type Task<T> = {
  code: (signal: AbortSignalPolyfill) => Promise<T> | T;
  priority: number;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
  abortController: AbortControllerPolyfill;
};

type Mutex = {
  taskQueue: Task<any>[];
  task: Promise<any>;
};

export const makePriorityMutex = () => {
  const mutexData: Mutex = {
    taskQueue: [],
    task: Promise.resolve(),
  };

  const executeTask = async () => {
    while (mutexData.taskQueue.length > 0) {
      const { code, resolve, reject, abortController } = mutexData.taskQueue.pop()!;

      if (abortController.signal.aborted) {
        reject(new Error('Task was aborted'));
        continue;
      }

      try {
        const result = await code(abortController.signal);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }
  };

  return {
    mutex<T>(code: (signal: AbortSignalPolyfill) => Promise<T> | T, priority = 0): Promise<T> {
      const abortController = new AbortControllerPolyfill();

      return new Promise<T>((resolve, reject) => {
        mutexData.taskQueue.push({
          code: () => code(abortController.signal),
          priority,
          resolve,
          reject,
          abortController,
        });
        mutexData.taskQueue.sort((a, b) => b.priority - a.priority);

        if (mutexData.taskQueue.length === 1) {
          mutexData.task = executeTask();
        }
      });
    },

    clear(): void {
      mutexData.taskQueue.forEach((task) => {
        task.abortController.abort(); // Отменяем каждую задачу
      });
      mutexData.taskQueue = [];
    },

    abortAll(): void {
      // Отменяет текущую и все последующие задачи
      mutexData.taskQueue.forEach((task) => {
        task.abortController.abort();
      });
    },

    data: mutexData,
  };
};

export const makeKeyedPriorityMutex = () => {
  const mutexes = new Map<string, ReturnType<typeof makePriorityMutex>>();

  return {
    mutex<T>(key: string, code: (signal: AbortSignalPolyfill) => Promise<T> | T, priority = 0): Promise<T> {
      let mutex = mutexes.get(key);

      if (mutex == null) {
        mutex = makePriorityMutex();
        mutexes.set(key, mutex);
      }

      return mutex.mutex(code, priority);
    },
    clear(key: string): void {
      const mutex = mutexes.get(key);

      if (mutex) {
        mutex.clear();
      }
    },
  };
};
