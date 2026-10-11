export { findAllNamespacesForLocale } from "../../config/locales";

/** `some-other_namespace` → `NamespaceSomeOtherNamespaceTranslation` */
export const getTypeNameForNamespace = (namespace: string): string => {
  const transformedNamespace = namespace
    .split(/[\s_-]/g)
    .map((part) => `${part.substring(0, 1).toUpperCase()}${part.substring(1)}`)
    .join("");

  return `Namespace${transformedNamespace}Translation`;
};
