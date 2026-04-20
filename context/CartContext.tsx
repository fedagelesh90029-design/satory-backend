import React, { createContext, useContext, useState } from 'react';

interface CartItem {
  _id: string;
  name: string;
  price: number;
  category: string;
  qty: number;
}

interface CartCtx {
  items: CartItem[];
  add: (product: any) => void;
  remove: (id: string) => void;
  increment: (id: string) => void;
  decrement: (id: string) => void;
  clear: () => void;
  total: number;
  count: number;
}

const CartContext = createContext<CartCtx>({} as CartCtx);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const add = (product: any) => {
    setItems(prev => {
      const id = product._id || product.id;
      const existing = prev.find(i => i._id === id);
      if (existing) return prev.map(i => i._id === id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { _id: id, name: product.name, price: product.price, category: product.category, qty: 1 }];
    });
  };

  const remove = (id: string) => setItems(prev => prev.filter(i => i._id !== id));

  const increment = (id: string) =>
    setItems(prev => prev.map(i => i._id === id ? { ...i, qty: i.qty + 1 } : i));

  const decrement = (id: string) =>
    setItems(prev => prev.map(i => i._id === id ? { ...i, qty: Math.max(1, i.qty - 1) } : i));

  const clear = () => setItems([]);

  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  const count = items.reduce((s, i) => s + i.qty, 0);

  return (
    <CartContext.Provider value={{ items, add, remove, increment, decrement, clear, total, count }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
