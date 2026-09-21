/**
 * Короткие подписи категорий для чипов мобильного каталога (раскладка как у
 * FBG, решение владельца 21.09.2026). Полные названия («Nail Extension gel»,
 * «Disguise collection») в одну-две строки чипов не помещаются; в заголовке
 * страницы, крошках и меню остаётся полное имя из ARM. Категория без короткого
 * имени показывается полным.
 */
export const CATEGORY_SHORT_NAMES: Record<string, string> = {
  base_gel: 'Base',
  construction_gel: 'Construction',
  acrylate_gel: 'Acrylate',
  framework_gel: 'Framework',
  nail_extension_gel: 'Extension',
  color_gel: 'Color',
  disguise_collection: 'Disguise',
  top_gel: 'Top',
};

export function categoryShortName(category: { slug: string; name: string }): string {
  return CATEGORY_SHORT_NAMES[category.slug] ?? category.name;
}
