import type { AnyBaseTranslation } from "../../../runtime/core";
import { NEW_LINE } from "../../constants";
import { TOOL_NAME } from "../../output";
import { wrapObjectKeyIfNeeded } from "../../utils/generator";
import type { Logger } from "../../utils/logger";
import { wrapUnionType } from "./utils";

export const validateNamespaces = (
  translations: AnyBaseTranslation,
  namespaces: string[],
  logger: Logger,
): void => {
  for (const namespace of namespaces) {
    if (typeof (translations as Record<string, unknown>)[namespace] === "string") {
      logger.error(
        `namespace '${namespace}' cant be a \`string\`. Must be an \`object\` or \`Array\`.`,
      );
    }
  }
};

export const createNamespacesTypes = (namespaces: string[]): string => `
export type Namespaces =${wrapUnionType(namespaces)}

type DisallowNamespaces = {${namespaces
  .map(
    (namespace) => `
	/**
	 * reserved for '${namespace}'-namespace\\
	 * you need to use the \`./${namespace}/index.ts\` file instead
	 */
	${wrapObjectKeyIfNeeded(
    namespace,
  )}?: "[${TOOL_NAME}] reserved for '${namespace}'-namespace. You need to use the \`./${namespace}/index.ts\` file instead."`,
  )
  .join(NEW_LINE)}
}`;
