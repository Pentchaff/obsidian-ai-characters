import type { Response } from 'openai/_shims/fetch';
export declare class Stream<Item> implements AsyncIterable<Item> {
  private response;
  private controller;
  private decoder;
  constructor(response: Response, controller: AbortController);
  private iterMessages;
  [Symbol.asyncIterator](): AsyncIterator<Item, any, undefined>;
}
//# sourceMappingURL=streaming.d.ts.map
