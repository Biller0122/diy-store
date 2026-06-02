export type ProductCategoryOption = {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  parent?: { id: string; name: string; slug: string } | null;
};

export type ProductCategoryGroup = {
  parent: ProductCategoryOption;
  children: ProductCategoryOption[];
};

const ROOT_COLLECTION_SLUG = '__root_collection__';

export function isRootCollection(category: ProductCategoryOption) {
  return category.slug === ROOT_COLLECTION_SLUG;
}

export function isTopLevelCategory(category: ProductCategoryOption) {
  return !category.parent || category.parent.slug === ROOT_COLLECTION_SLUG;
}

export function buildCategoryGroups(categories: ProductCategoryOption[]): ProductCategoryGroup[] {
  const visible = categories.filter((category) => !isRootCollection(category));
  const topLevel = visible.filter(isTopLevelCategory);
  const childrenByParentId = new Map<string, ProductCategoryOption[]>();

  for (const category of visible) {
    if (isTopLevelCategory(category) || !category.parent?.id) continue;
    const children = childrenByParentId.get(category.parent.id) ?? [];
    children.push(category);
    childrenByParentId.set(category.parent.id, children);
  }

  const groupedChildIds = new Set(
    Array.from(childrenByParentId.values()).flatMap((children) => children.map((child) => child.id)),
  );

  return [
    ...topLevel.map((parent) => ({
      parent,
      children: childrenByParentId.get(parent.id) ?? [],
    })),
    ...visible
      .filter((category) => !isTopLevelCategory(category) && !groupedChildIds.has(category.id))
      .map((parent) => ({ parent, children: [] })),
  ];
}

export function getCategoryDisplayName(category: ProductCategoryOption) {
  if (category.parent && category.parent.slug !== ROOT_COLLECTION_SLUG) {
    return `${category.parent.name} / ${category.name}`;
  }
  return category.name;
}
