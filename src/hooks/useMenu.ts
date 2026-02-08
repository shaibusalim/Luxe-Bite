import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MenuCategory, MenuItem } from '@/lib/types';

export const useMenuCategories = () => {
  return useQuery({
    queryKey: ['menu-categories'],
    queryFn: async (): Promise<MenuCategory[]> => {
      const { data, error } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as MenuCategory[];
    },
  });
};

export const useMenuItems = () => {
  return useQuery({
    queryKey: ['menu-items'],
    queryFn: async (): Promise<MenuItem[]> => {
      const { data, error } = await supabase
        .from('menu_items')
        .select(`
          *,
          category:menu_categories(*)
        `)
        .eq('is_available', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      
      // Filter weekend-only items if not weekend
      const now = new Date();
      const isWeekend = now.getDay() === 0 || now.getDay() === 6;
      
      return (data as MenuItem[]).filter(item => !item.is_weekend_only || isWeekend);
    },
  });
};

export const useAllMenuItems = () => {
  return useQuery({
    queryKey: ['all-menu-items'],
    queryFn: async (): Promise<MenuItem[]> => {
      const { data, error } = await supabase
        .from('menu_items')
        .select(`
          *,
          category:menu_categories(*)
        `)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as MenuItem[];
    },
  });
};

export const useAllCategories = () => {
  return useQuery({
    queryKey: ['all-categories'],
    queryFn: async (): Promise<MenuCategory[]> => {
      const { data, error } = await supabase
        .from('menu_categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as MenuCategory[];
    },
  });
};
