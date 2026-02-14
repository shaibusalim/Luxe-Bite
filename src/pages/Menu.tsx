import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useMenuCategories, useMenuItems } from '@/hooks/useMenu';
import { useAddToCart } from '@/hooks/useAddToCart';
import CategoryTabs from '@/components/CategoryTabs';
import MenuItemCard from '@/components/MenuItemCard';
import LoadingSpinner from '@/components/LoadingSpinner';

const Menu = () => {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const addToCart = useAddToCart();

  const { data: categories, isLoading: categoriesLoading } = useMenuCategories();
  const { data: menuItems, isLoading: itemsLoading } = useMenuItems();

  const filteredItems = useMemo(() => {
    if (!menuItems) return [];
    
    return menuItems.filter((item) => {
      const matchesCategory = !activeCategory || item.category_id === activeCategory;
      const matchesSearch = !searchQuery || 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesCategory && matchesSearch;
    });
  }, [menuItems, activeCategory, searchQuery]);

  const groupedItems = useMemo(() => {
    if (activeCategory || searchQuery) return null;
    
    return filteredItems.reduce((acc, item) => {
      const categoryName = item.category?.name || 'Other';
      if (!acc[categoryName]) acc[categoryName] = [];
      acc[categoryName].push(item);
      return acc;
    }, {} as Record<string, typeof filteredItems>);
  }, [filteredItems, activeCategory, searchQuery]);

  if (categoriesLoading || itemsLoading) {
    return <LoadingSpinner text="Loading menu..." />;
  }

  return (
    <div className="container px-4 py-6">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">Our Menu</h1>
        <p className="text-muted-foreground">Fresh, authentic Ghanaian cuisine</p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Search dishes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Category Tabs */}
      {categories && (
        <CategoryTabs
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />
      )}

      {/* Menu Items */}
      <div className="mt-6">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No dishes found</p>
          </div>
        ) : groupedItems && !activeCategory && !searchQuery ? (
          // Grouped by category
          Object.entries(groupedItems).map(([categoryName, items]) => (
            <div key={categoryName} className="mb-8">
              <h2 className="font-display text-xl font-bold text-foreground mb-4">
                {categoryName}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {items.map((item) => (
                  <MenuItemCard key={item.id} item={item} onAddToCart={addToCart} />
                ))}
              </div>
            </div>
          ))
        ) : (
          // Flat list
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredItems.map((item) => (
              <MenuItemCard key={item.id} item={item} onAddToCart={addToCart} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Menu;
