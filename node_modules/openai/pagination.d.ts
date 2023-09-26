import { AbstractPage, Response, APIClient, FinalRequestOptions } from './core.js';
export interface PageResponse<Item> {
  data: Array<Item>;
  object: string;
}
/**
 * Note: no pagination actually occurs yet, this is for forwards-compatibility.
 */
export declare class Page<Item> extends AbstractPage<Item> implements PageResponse<Item> {
  object: string;
  data: Array<Item>;
  constructor(client: APIClient, response: Response, body: PageResponse<Item>, options: FinalRequestOptions);
  getPaginatedItems(): Item[];
  /**
   * This page represents a response that isn't actually paginated at the API level
   * so there will never be any next page params.
   */
  nextPageParams(): null;
  nextPageInfo(): null;
}
//# sourceMappingURL=pagination.d.ts.map
