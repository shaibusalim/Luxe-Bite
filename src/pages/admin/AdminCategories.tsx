import { useAllCategories } from '@/hooks/useMenu';
import LoadingSpinner from '@/components/LoadingSpinner';
import { motion } from 'framer-motion';
import { Layers } from 'lucide-react';

const AdminCategories = () => {
  const { data: categories, isLoading } = useAllCategories();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <motion.div
        className="mb-6"
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">Categories</h1>
        <p className="text-muted-foreground mt-0.5">
          Menu categories. Create, edit, or delete categories from your menu structure.
        </p>
      </motion.div>

      {!categories?.length ? (
        <motion.div
          className="text-center py-16 rounded-xl bg-muted/30 border border-dashed border-border"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">No categories yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Categories are managed via your data source.
          </p>
        </motion.div>
      ) : (
        <div className="grid gap-3 max-w-2xl">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="card-elevated p-4 rounded-xl hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground">{cat.name}</h3>
                  {cat.description && (
                    <p className="text-sm text-muted-foreground mt-0.5 truncate">
                      {cat.description}
                    </p>
                  )}
                </div>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 ${
                    cat.is_active ? 'bg-emerald-500/15 text-emerald-700' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {cat.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminCategories;
