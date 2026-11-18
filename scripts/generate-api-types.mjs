import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import nextEnv from "@next/env";
import openapiTS, { astToString } from "openapi-typescript";

const projectDir = process.cwd();
const { loadEnvConfig } = nextEnv;
loadEnvConfig(projectDir);

const apiUrl = process.env.API_URL;
if (!apiUrl) {
  throw new Error("API_URL is required. Set it in the root .env.local file.");
}

let apiBaseUrl;
try {
  apiBaseUrl = new URL(apiUrl);
} catch {
  throw new Error("API_URL must be an absolute URL.");
}

const apiPath = apiBaseUrl.pathname.replace(/\/+$/, "");
if (!apiPath.endsWith("/api")) {
  throw new Error("API_URL must point to the API root and end in /api.");
}

apiBaseUrl.pathname = `${apiPath}/`;
apiBaseUrl.search = "";
apiBaseUrl.hash = "";

const openApiUrl = new URL("../doc", apiBaseUrl);
const ast = await openapiTS(openApiUrl.href);
const outputPath = resolve(projectDir, "lib/api/generated.ts");

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, astToString(ast));

console.log(`Generated ${outputPath} from ${openApiUrl.origin}${openApiUrl.pathname}`);
