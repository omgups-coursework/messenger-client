import {wait} from "~/lib/thread/wait";

export type MutexIdleCallback = (m: Mutex) => void;

export type MutexUnlockCallback = () => Promise<void>;

export class Mutex {
  public readonly resourceId: string;

  private locked = false;
  private waitingQueue: Array<() => void> = [];
  private refCount = 0;
  private onIdleCallback: MutexIdleCallback | null = null;

  public constructor(resourceId: string) {
    this.resourceId = resourceId;
  }

  public onIdle(callback: MutexIdleCallback): void {
    this.onIdleCallback = callback;
  }

  public lock(): Promise<MutexUnlockCallback> {
    return new Promise<MutexUnlockCallback>((resolve) => {
      const tryLock = () => {
        if (this.locked) {
          // Если сейчас ресурс захвачен – встаём в очередь
          this.waitingQueue.push(tryLock);

          return;
        }

        // Захватываем
        this.locked = true;
        // Увеличиваем счётчик активных блокировок
        this.refCount++;

        // Возвращаем функцию для разблокировки
        const unlock: MutexUnlockCallback = async () => {
          // Сбрасываем флаг
          this.locked = false;
          // Уменьшаем счётчик
          this.refCount--;

          // Беспокоим следующего гандона в очереди
          const next = this.waitingQueue.shift();

          if (next) {
            await wait(1);
            next();

            return;
          }

          // Очередь пуста. Возможно, никто больше не хочет ресурс
          // Если refCount === 0, значит все окич
          if (this.refCount === 0 && this.onIdleCallback !== null) {
            this.onIdleCallback(this);
          }
        };

        // Отдаём функцию разблокировки
        resolve(unlock);
      };

      tryLock();
    });
  }
}
