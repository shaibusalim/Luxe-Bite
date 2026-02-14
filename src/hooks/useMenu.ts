import { useQuery } from '@tanstack/react-query';
import type { MenuCategory, MenuItem } from '@/lib/types';

const nowIso = () => new Date().toISOString();

const fallbackCategories: MenuCategory[] = [
  { id: 'main', name: 'Main Dishes', description: null, sort_order: 1, is_active: true, created_at: nowIso() },
  { id: 'sides', name: 'Sides', description: null, sort_order: 2, is_active: true, created_at: nowIso() },
];

const fallbackItems: MenuItem[] = [
  {
    id: '1',
    category_id: 'main',
    name: 'Jollof Rice & Chicken',
    description: 'Smoky, flavorful rice cooked in rich tomato sauce with grilled chicken',
    price: 35,
    image_url: null,
    is_available: true,
    is_weekend_only: false,
    sort_order: 1,
    created_at: nowIso(),
    updated_at: nowIso(),
    category: fallbackCategories[0],
  },
  {
    id: '2',
    category_id: 'main',
    name: 'Banku & Tilapia',
    description: 'Fermented corn dough served with grilled tilapia and pepper sauce',
    price: 45,
    image_url: null,
    is_available: true,
    is_weekend_only: false,
    sort_order: 2,
    created_at: nowIso(),
    updated_at: nowIso(),
    category: fallbackCategories[0],
  },
  {
    id: '3',
    category_id: 'main',
    name: 'Waakye Special',
    description: 'Rice and beans with spaghetti, shito, egg, and fried plantain',
    price: 30,
    image_url: null,
    is_available: true,
    is_weekend_only: false,
    sort_order: 3,
    created_at: nowIso(),
    updated_at: nowIso(),
    category: fallbackCategories[0],
  },
  {
    id: '4',
    category_id: 'sides',
    name: 'Kelewele',
    description: 'Spicy fried plantain cubes with ginger and chili',
    price: 15,
    image_url: null,
    is_available: true,
    is_weekend_only: false,
    sort_order: 1,
    created_at: nowIso(),
    updated_at: nowIso(),
    category: fallbackCategories[1],
  },
];

export const useMenuCategories = () => {
  return useQuery({
    queryKey: ['menu-categories'],
    queryFn: async (): Promise<MenuCategory[]> => {
      try {
        const res = await fetch('/api/menu-categories');
        if (!res.ok) throw new Error('Failed to fetch categories');
        const data = await res.json();
        return data as MenuCategory[];
      } catch {
        return fallbackCategories;
      }
    },
  });
};

export const useAllCategories = () => {
  return useQuery({
    queryKey: ['all-categories'],
    queryFn: async (): Promise<MenuCategory[]> => {
      try {
        const res = await fetch('/api/all-categories');
        if (!res.ok) throw new Error('Failed to fetch categories');
        const data = await res.json();
        return data as MenuCategory[];
      } catch {
        return fallbackCategories;
      }
    },
  });
};

export const useMenuItems = () => {
  return useQuery({
    queryKey: ['menu-items'],
    queryFn: async (): Promise<MenuItem[]> => {
      let data: MenuItem[];
      try {
        const res = await fetch('/api/menu-items');
        if (!res.ok) throw new Error('Failed to fetch items');
        data = (await res.json()) as MenuItem[];
      } catch {
        data = fallbackItems;
      }
      const now = new Date();
      const isWeekend = now.getDay() === 0 || now.getDay() === 6;
      return data.filter(item => !item.is_weekend_only || isWeekend);
    },
  });
};

export const useAllMenuItems = () => {
  return useQuery({
    queryKey: ['all-menu-items'],
    queryFn: async (): Promise<MenuItem[]> => {
      try {
        const res = await fetch('/api/all-menu-items');
        if (!res.ok) throw new Error('Failed to fetch items');
        const data = await res.json();
        return data as MenuItem[];
      } catch {
        return fallbackItems;
      }
    },
  });
};
