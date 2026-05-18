import React, { createContext, useContext, useState } from 'react';

interface CartItem {
  _id: string;
  name: string;
  price: number;
  category: string;
  image_url?: string;
  weight?: string;
  qty: number;
  options?: {
    tea_id?: string;
    tea_name?: string;
    tea_price?: number;
    weight?: number;
  };
}

interface CartCtx {
  items: CartItem[];
  add: (product: any, options?: CartItem['options']) => void;
  remove: (id: string, optionsJson?: string) => void;
  increment: (id: string, optionsJson?: string) => void;
  decrement: (id: string, optionsJson?: string) => void;
  clear: () => void;
  total: number;
  count: number;
}

const CartContext = createContext<CartCtx>({} as CartCtx);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const add = (product: any, options?: CartItem['options']) => {
    setItems(prev => {
      const id = product._id || product.id;
      const optKey = options ? JSON.stringify(options) : undefined;
      const existing = prev.find(i => i._id === id && JSON.stringify(i.options) === optKey);
      
      if (existing) {
        return prev.map(i => (i._id === id && JSON.stringify(i.options) === optKey) ? { ...i, qty: i.qty + 1 } : i);
      }
      
      let price = Number(product.price);
      
      // Handle 'Tea to Go' (add tea price for 6 grams)
      if (options?.tea_price) {
        price += (Number(options.tea_price) * 6);
      }

      return [...prev, { 
        _id: id, 
        name: product.name, 
        price, 
        category: product.category, 
        image_url: product.image_url,
        weight: product.weight,
        qty: 1,
        options 
      }];
    });
  };

  const remove = (id: string, optionsJson?: string) => 
    setItems(prev => prev.filter(i => !(i._id === id && JSON.stringify(i.options) === optionsJson)));

  const increment = (id: string, optionsJson?: string) =>
    setItems(prev => prev.map(i => (i._id === id && JSON.stringify(i.options) === optionsJson) ? { ...i, qty: i.qty + 1 } : i));

  const decrement = (id: string, optionsJson?: string) =>
    setItems(prev => prev.map(i => (i._id === id && JSON.stringify(i.options) === optionsJson) ? { ...i, qty: Math.max(1, i.qty - 1) } : i));

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
