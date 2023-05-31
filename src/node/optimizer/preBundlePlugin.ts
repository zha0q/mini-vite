import { Loader, Plugin } from "esbuild";
import { BARE_IMPORT_RE } from "./constants";
import resolve from "resolve";
import { init, parse } from "es-module-lexer";
import { normalizePath } from "../utils";
import fs from "fs-extra";
import path from 'path';
import createDebug from "debug";

const debug = createDebug("dev");

export function preBundlePlugin(deps: Set<string>): Plugin {
    return {
        name: "esbuild:pre-bundle",
        setup(build) {
          build.onResolve(
            {
              filter: BARE_IMPORT_RE,
            },
            (resolveInfo) => {
              const { path: id, importer } = resolveInfo;
              const isEntry = !importer;
              console.log(isEntry, id);
              // 命中需要预编译的依赖
              if (deps.has(id)) {
                // 若为入口，则标记 dep 的 namespace
                // 源码中
                // if 入口模块
                //     将模块解析为namespace='dep'的处理流程 直接 import 的模块或者通过 include 制定的模块，如：import Vue from 'vue';
                // else 依赖模块 入口模块自身的依赖，也就是 dependencies
                //     if 为browser-external模块
                //         将模块解析为namespace='browser-external'的处理流程
                //     if 以http(s)引入的模块
                //         将模块解析为外部引用模块
                //     else
                //         直接解析路径


                return isEntry
                  ? {
                      path: id,
                      namespace: "dep",
                    }
                  : {
                      // 因为走到 onResolve 了，所以这里的 path 就是绝对路径了 ?? 处理的是什么吗
                      path: resolve.sync(id, { basedir: process.cwd() }),
                    };
              }
            }
          );

          // 构建虚拟模块（通过虚拟模块打包所有预渲染模块）
          // 代理模块通过文件系统直接读取真实模块的内容，而不是进行重导出，
          // 因此由于此时代理模块跟真实模块并没有任何的引用关系，
          // 这就导致最后的react.js和@emotion/react.js两份产物并不会引用同一份 Chunk，
          // Esbuild 最后打包出了内容完全相同的两个 Chunk！
          build.onLoad({
            filter: /.*/,
            namespace: 'dep'
          }, async (loadInfo) => {
            await init;
            const id = loadInfo.path;
            const root = process.cwd();
            const entryPath = normalizePath(resolve.sync(id, { basedir: root }));
            const code = await fs.readFile(entryPath, "utf-8");
            const [imports, exports] = await parse(code);
            let proxyModule = [];
            // cjs
          if (!imports.length && !exports.length) {
            // 构造代理模块
            // 下面的代码后面会解释
            const res = require(entryPath);
            const specifiers = Object.keys(res);
            proxyModule.push(
              `export { ${specifiers.join(",")} } from "${entryPath}"`,
              `export default require("${entryPath}")`
            );
          } else {
            // esm 格式比较好处理，export * 或者 export default 即可
            if (exports.includes("default" as any)) {
              proxyModule.push(`import d from "${entryPath}";export default d`);
            }
            proxyModule.push(`export * from "${entryPath}"`);
          }
          debug("代理模块内容: %o", proxyModule.join("\n"));
          console.log('代理', proxyModule.join("\n"));
          const loader = path.extname(entryPath).slice(1);
          return {
            loader: loader as Loader,
            contents: proxyModule.join("\n"),
            resolveDir: root,
          };
          })
        }
        //对于老版本的“esbuild”，为了扁平化依赖的预构建产品，会使用agent模块处理“require('react /jsx runtime.js')”路径，
        // 所以没有直接修改路径重定向到条目是产品将具有嵌套结构。还添加了后续包装以防止二次包装。
        // 但是，对于当前版本的“esbuild”，即使直接重定向到入口模块，产品名称仍然由入口点指定，不会导致二次包装或嵌套产品。因此，我们现在不需要使用代理模块。
    }
}