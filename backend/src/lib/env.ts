const isProduction = process.env.NODE_ENV === "production";

export function getMissingEnv(names: string[]) {
  return names.filter((name) => !process.env[name]);
}

export function buildMissingEnvMessage(
  missingNames: string[],
  productionMessage: string
) {
  if (missingNames.length === 0) {
    return null;
  }

  if (isProduction) {
    return productionMessage;
  }

  return `缺少环境变量: ${missingNames.join(", ")}`;
}

export function logMissingEnv(scope: string, missingNames: string[]) {
  if (missingNames.length === 0) {
    return;
  }

  console.error(`[env] ${scope} missing env: ${missingNames.join(", ")}`);
}
