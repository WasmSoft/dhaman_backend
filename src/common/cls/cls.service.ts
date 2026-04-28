import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import { RequestContext } from './request-context.type';

@Injectable()
export class ClsService {
  private readonly storage = new AsyncLocalStorage<RequestContext>();

  run<T>(context: RequestContext, callback: () => T): T {
    return this.storage.run(context, callback);
  }

  get<T extends keyof RequestContext>(key: T): RequestContext[T] | undefined {
    return this.storage.getStore()?.[key];
  }

  getContext(): RequestContext | undefined {
    return this.storage.getStore();
  }

  setContext(partialContext: Partial<RequestContext>): void {
    const context = this.storage.getStore();

    if (!context) {
      return;
    }

    Object.assign(context, partialContext);
  }
}
