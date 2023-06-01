import { pathExists, readFile } from "fs-extra";
import { Plugin } from "../plugin";
import { ServerContext } from "../server";
import { cleanUrl, getShortName, normalizePath } from "../utils";

export function assetPlugin(): Plugin {
  let serverContext: ServerContext;

  return {
    name: "m-vite:asset",
    configureServer(s) {
      serverContext = s;
    },
    async load(id) {
      const cleanedId = cleanUrl(id);
      const resolvedId = `/${getShortName(normalizePath(id), serverContext.root)}`;

      // 这里仅处理 svg
      if (cleanedId.endsWith(".svg")) {
        return {
          code: `export default "${resolvedId}"`,
        };
      }
    },
  };
}
