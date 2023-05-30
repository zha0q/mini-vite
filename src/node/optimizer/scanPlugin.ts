import { Plugin } from "esbuild";
import { BARE_IMPORT_RE, EXTERNAL_TYPES } from "./constants";

export function scanPlugin(deps: Set<string>): Plugin {
    return {
        name: 'esbuild:scan-deps',
        setup(build) {
            // 忽略文件类型
            build.onResolve({
                filter: new RegExp(`\\.(${EXTERNAL_TYPES.join("|")})$`)
            }, (resolveInfo) => ({
                path: resolveInfo.path,
                // You can mark a file or a package as external to exclude it from your build. Instead of being bundled, the import will be preserved
                external: true,
            }));
            // 纪录依赖
            build.onResolve({filter: BARE_IMPORT_RE,}, (resolveInfo) => {
                const {path: id} = resolveInfo;
                deps.add(id);
                return {
                    path: id,
                    external: true,
                }
            })
        }
    }
}