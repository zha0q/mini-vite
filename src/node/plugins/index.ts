import { Plugin } from "../plugin";
import { assetPlugin } from "./assets";
import { cssPlugin } from "./css";
import { esbuildTransformPlugin } from "./esbuild";
import { importAnalysisPlugin } from "./importAnalysis";
import { resolvePlugin } from "./resolve";

export function resolvePlugins(): Plugin[] {
  // 解析url请求到资源路径、解析ts/tsx文件、解析依赖(将相对路径依赖解析为绝对路径/第三方依赖解析到预构建地)
  return [resolvePlugin(), esbuildTransformPlugin(), importAnalysisPlugin(), cssPlugin(), assetPlugin()];
}
