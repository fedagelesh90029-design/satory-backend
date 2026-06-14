import React, { createContext, useContext, useState, useRef } from 'react';
import { StyleSheet, Text, Animated } from 'react-native';
import { Colors } from '../constants/theme';

interface CartItem {
  _id: string;
  name: string;
  price: number;
  category: string;
  image_url?: string;
  weight?: string;
  qty: number;
  unit?: string;
  stock?: number;
  options?: {
    tea_id?: string;
    tea_name?: string;
    tea_price?: number;
    weight?: number;
  };
}

interface CartCtx {
  items: CartItem[];
  add: (product: any, options?: CartItem['options'], quantity?: number) => void;
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
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimeout = useRef<any>(null);

  const showToast = (message: string) => {
    if (toastTimeout.current) {
      clearTimeout(toastTimeout.current);
    }
    setToastMessage(message);
    toastAnim.setValue(0);
    
    // Fade in
    Animated.timing(toastAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();

    // Set timeout to fade out
    toastTimeout.current = setTimeout(() => {
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setToastMessage(null);
      });
    }, 2000);
  };

  const add = (product: any, options?: CartItem['options'], quantity = 1) => {
    setItems(prev => {
      const id = product._id || product.id;
      const optKey = options ? JSON.stringify(options) : undefined;
      const existing = prev.find(i => i._id === id && JSON.stringify(i.options) === optKey);
      
      const maxStock = product.stock ?? 9999;
      if (existing) {
        return prev.map(i => (i._id === id && JSON.stringify(i.options) === optKey) ? { ...i, qty: Math.min(maxStock, i.qty + quantity) } : i);
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
        qty: Math.min(maxStock, quantity),
        unit: product.unit,
        stock: product.stock,
        options 
      }];
    });

    const isByWeight = product.unit === 'г' || product.unit === 'гр';
    if (isByWeight) {
      showToast(`🍵 ${product.name} (${quantity}г) добавлен в корзину`);
    } else {
      showToast(`🍵 ${product.name} добавлен в корзину`);
    }
  };

  const remove = (id: string, optionsJson?: string) => 
    setItems(prev => prev.filter(i => !(i._id === id && JSON.stringify(i.options) === optionsJson)));

  const increment = (id: string, optionsJson?: string) =>
    setItems(prev => prev.map(i => (i._id === id && JSON.stringify(i.options) === optionsJson) ? { ...i, qty: Math.min(i.stock ?? 9999, i.qty + 1) } : i));

  const decrement = (id: string, optionsJson?: string) =>
    setItems(prev => prev.map(i => {
      if (i._id === id && JSON.stringify(i.options) === optionsJson) {
        const isByWeight = i.unit === 'г' || i.unit === 'гр';
        const minQty = isByWeight ? 25 : 1;
        return { ...i, qty: Math.max(minQty, i.qty - 1) };
      }
      return i;
    }));

  const clear = () => setItems([]);

  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  const count = items.reduce((s, i) => s + i.qty, 0);

  return (
    <CartContext.Provider value={{ items, add, remove, increment, decrement, clear, total, count }}>
      {children}
      {toastMessage && (
        <Animated.View style={[
          styles.toastContainer,
          {
            opacity: toastAnim,
            transform: [{
              translateY: toastAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [30, 0]
              })
            }]
          }
        ]}>
          <Text style={styles.toastText} numberOfLines={2}>{toastMessage}</Text>
        </Animated.View>
      )}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    bottom: 95,
    left: 20,
    right: 20,
    backgroundColor: '#1C1C1E',
    borderColor: Colors.gold,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 8,
    zIndex: 9999,
  },
  toastText: {
    color: Colors.gold,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 18,
  },
});
