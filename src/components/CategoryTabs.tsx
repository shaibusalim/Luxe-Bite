import { Button } from '@/components/ui/button';
import { MenuCategory } from '@/lib/types';
import { cn } from '@/lib/utils';

interface CategoryTabsProps {
  categories: MenuCategory[];
  activeCategory: string | null;
  onCategoryChange: (categoryId: string | null) => void;
}

const CategoryTabs = ({ categories, activeCategory, onCategoryChange }: CategoryTabsProps) => {
  return (
    <div className="sticky top-16 z-30 bg-background/95 backdrop-blur-sm py-3 -mx-4 px-4 border-b border-border">
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <Button
          variant={activeCategory === null ? 'default' : 'outline'}
          size="sm"
          onClick={() => onCategoryChange(null)}
          className={cn(
            'whitespace-nowrap flex-shrink-0',
            activeCategory === null && 'btn-primary-gradient border-0'
          )}
        >
          All
        </Button>
        {categories.map((category) => (
          <Button
            key={category.id}
            variant={activeCategory === category.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => onCategoryChange(category.id)}
            className={cn(
              'whitespace-nowrap flex-shrink-0',
              activeCategory === category.id && 'btn-primary-gradient border-0'
            )}
          >
            {category.name}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default CategoryTabs;
