import connect from "connect";
import {blue, green} from 'picocolors';
import { optimize } from "../optimizer";
import { resolvePlugins } from "../plugins";
import { createPluginContainer, PluginContainer } from "../pluginContainer";
import { Plugin } from "../plugin";
import { indexHtmlMiddware } from "./middlewares/indexHtml";
import { transformMiddleware } from "./middlewares/transform";
import { staticMiddleware } from "./middlewares/static";

export interface ServerContext {
    root: string;
    pluginContainer: PluginContainer;
    app: connect.Server;
    plugins: Plugin[];
}


export async function startDevServer() {
    const app = connect();
    const root = process.cwd();
    const startTime = Date.now();
    const plugins = resolvePlugins();
    const pluginContainer = createPluginContainer(plugins);

    const serverContext: ServerContext = {
        root: process.cwd(),
        app,
        pluginContainer,
        plugins
    }

    // TODO: ？configureServer reolvePlugins
    for(const plugin of plugins) {
        if(plugin.configureServer) {
            await plugin.configureServer(serverContext);
        }
    }

    // 处理html并返回
    app.use(indexHtmlMiddware(serverContext));

    // 转换ts/tsx文件
    app.use(transformMiddleware(serverContext));

    /** 静态资源中间件
     *  对于import的静态资源 在importAnalysis时将其封装为JS模块并指向真实地址并转到下一步
     *  对于非import，响应具体内容用中间件
     * */ 
     
    app.use(staticMiddleware(serverContext.root));

    app.listen(3000, async () => {
        // 依赖预构建
        await optimize(root);

        console.log(
            green("🚀 No-Bundle 服务已经成功启动!"),
            `耗时: ${Date.now() - startTime}ms`
          );
          console.log(`> 本地访问路径: ${blue("http://localhost:3000")}`);
    })
}