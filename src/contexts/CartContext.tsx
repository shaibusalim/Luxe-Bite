import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CartItem, MenuItem } from '@/lib/types';

interface CartContextType {
  items: CartItem[];
  addItem: (item: MenuItem, quantity?: number, instructions?: string) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  updateInstructions: (itemId: string, instructions: string) => void;
  clearCart: () => void;
  getItemCount: () => number;
  getSubtotal: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    const stored = localStorage.getItem('luxebite-cart');
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    localStorage.setItem('luxebite-cart', JSON.stringify(items));
  }, [items]);

  const addItem = (item: MenuItem, quantity = 1, instructions?: string) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.id === item.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
          special_instructions: instructions || updated[existingIndex].special_instructions,
        };
        return updated;
      }
      return [...prev, { ...item, quantity, special_instructions: instructions }];
    });
  };

  const removeItem = (itemId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, quantity } : i))
    );
  };

  const updateInstructions = (itemId: string, instructions: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, special_instructions: instructions } : i))
    );
  };

  const clearCart = () => setItems([]);

  const getItemCount = () => items.reduce((sum, i) => sum + i.quantity, 0);

  const getSubtotal = () =>
    items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        updateInstructions,
        clearCart,
        getItemCount,
        getSubtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
