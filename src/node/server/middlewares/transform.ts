import { NextHandleFunction } from "connect";
import { isJSRequest, cleanUrl, isCSSRequest, isImportRequest } from "../../utils";
import { ServerContext } from "..";
import createDebug from "debug";

const debug = createDebug("dev");

export async function transformRequest(url: string, serverContext: ServerContext) {
    const {pluginContainer, moduleGraph} = serverContext;
    url = cleanUrl(url);

    let mod = await moduleGraph.getModuleByUrl(url);
    if(mod && mod.transformResult) {
        return mod.transformResult;
    }

    // 将请求的url /src/main.tsx 定位到源文件 解析为 资源路径 
    const resolvedResult = await pluginContainer.resolveId(url);
    let transformResult;
    if(resolvedResult?.id) {
        let code = await pluginContainer.load(resolvedResult.id);
        if(typeof code === "object" && code !== null) {
            code = code.code;
        }
        const {moduleGraph} = serverContext;
        mod = await moduleGraph.ensureEntryFromUrl(url);
        if(code) {
            transformResult = await pluginContainer.transform(code as string, resolvedResult?.id);
        }
    }
    if(mod) {
        mod.transformResult = transformResult;
    }
    return transformResult;
}

export function transformMiddleware(serverContext: ServerContext): NextHandleFunction  {
    return async (req, res, next) => {
        if(req.method !== "GET" || !req.url) {
            return next();
        }
        const url = req.url;
        debug("transformMiddleware: %s", url);
        if(isJSRequest(url) || isCSSRequest(url) || isImportRequest(url)) {
            let result = await transformRequest(url, serverContext);
            console.log(serverContext.moduleGraph);
            if(!result) {
                return next();
            }
            if(result && typeof result !== "string") {
                result = result.code as any;
            }

            res.statusCode = 200;
            res.setHeader("Content-Type", "application/javascript");
            return res.end(result);
        }
        next();
    }
}