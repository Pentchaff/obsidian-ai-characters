'use strict';
// File generated from our OpenAPI spec by Stainless.
Object.defineProperty(exports, '__esModule', { value: true });
exports.Page = void 0;
const core_1 = require('./core.js');
/**
 * Note: no pagination actually occurs yet, this is for forwards-compatibility.
 */
class Page extends core_1.AbstractPage {
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
exports.Page = Page;
//# sourceMappingURL=pagination.js.map
