/* Node globals */
declare const process: any;
declare const console: any;

/* Node core modules */
declare module "crypto" {
  const crypto: any;
  export = crypto;
}

/* Express & CORS */
declare module "express" {
  const e: any;
  export = e;
}

declare module "cors" {
  const c: any;
  export = c;
}

