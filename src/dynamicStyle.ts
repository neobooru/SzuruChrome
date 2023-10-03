import { TagCategoryColor } from "./models";

export function makeCssName(prefix: string, name: string) {
  return prefix + "-" + name.replace(/[^a-z0-9]/g, "_");
}

export function refreshTagCategoryColorMap(tagCategories: TagCategoryColor[], styleElement?: HTMLStyleElement) {
  if (styleElement) {
    document.head.removeChild(styleElement);
  }
  styleElement = document.createElement("style");
  document.head.appendChild(styleElement);
  for (const category of tagCategories) {
    const ruleName = makeCssName("tag", category.name);

    if (styleElement.sheet) {
      styleElement.sheet.insertRule(`.${ruleName} { color: ${category.color} }`, styleElement.sheet.cssRules.length);
    } else {
      console.error("styleElement.sheet is undefined. This should never happen!");
    }
  }
  return styleElement;
}
