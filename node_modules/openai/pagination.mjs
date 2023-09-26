// File generated from our OpenAPI spec by Stainless.
import { AbstractPage } from './core.mjs';
/**
 * Note: no pagination actually occurs yet, this is for forwards-compatibility.
 */
export class Page extends AbstractPage {
  constructor(client, response, body, options) {
    super(client, response, body, options);
    this.object = body.object;
    this.data = body.data;
  }
  getPaginatedItems() {
    return this.data;
  }
  // @deprecated Please use `nextPageInfo()` instead
  /**
   * This page represents a response that isn't actually paginated at the API level
   * so there will never be any next page params.
   */
  nextPageParams() {
    return null;
  }
  nextPageInfo() {
    return null;
  }
}
//# sourceMappingURL=pagination.mjs.map
