export class AbortSignalPolyfill {
  private _aborted = false;

  public get aborted(): boolean {
    return this._aborted;
  }

  public abort(): void {
    if (!this._aborted) {
      this._aborted = true;
    }
  }
}

export class AbortControllerPolyfill {
  public readonly signal = new AbortSignalPolyfill();

  public abort(): void {
    (this.signal as AbortSignalPolyfill).abort();
  }
}

export class AbortErrorPolyfill extends Error {}
