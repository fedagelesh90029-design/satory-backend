import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';
import { apiFetch, MEDIA_BASE } from '../constants/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

interface Props {
  item: any;
  onPress?: () => void;
  onCart?: (qty?: number) => void;
  isFavorited?: boolean;
  hideFav?: boolean;
}

const BADGE_COLORS: Record<string, string> = {
  'Хит': '#C9A84C',
  'Новинка': '#4CAF50',
  'Арт': '#9C27B0',
};

function getPlaceholder(item: any) {
  const name = (item.name || '').toLowerCase();
  const cat  = (item.category || '').toLowerCase();
  if (cat === 'посуда' || name.includes('чайник')) return { emoji: '🫖', bg: '#2A1F14', accent: '#8B6914' };
  if (cat.includes('шу')) return { emoji: '🟤', bg: '#1A0A0A', accent: '#8B2020' };
  if (cat.includes('шэн')) return { emoji: '🟢', bg: '#0A1A0A', accent: '#2D6A2D' };
  return { emoji: '🍵', bg: '#1A1A0A', accent: '#5A4A20' };
}

export function ProductCard({ item, onPress, onCart, isFavorited = false, hideFav = false }: Props) {
  const { token } = useAuth();
  const { add } = useCart();
  const [fav, setFav] = useState(isFavorited);
  const [favLoading, setFavLoading] = useState(false);
  const [qtyModal, setQtyModal] = useState(false);
  const [weight, setWeight] = useState('25');

  const placeholder = getPlaceholder(item);
  const imageUri = item.image_url ? (item.image_url.startsWith('http') ? item.image_url : `${MEDIA_BASE}${item.image_url}`) : null;

  const isByWeight = item.unit === 'г' || item.unit === 'гр';

  const toggleFav = async () => {
    if (!token) return;
    setFavLoading(true);
    try {
      const id = item._id || item.id;
      const res = await apiFetch(`/products/${id}/favorite`, { method: 'POST' }, token);
      setFav(res.favorited);
    } catch {} finally { setFavLoading(false); }
  };

  const handleCartPress = () => {
    if (isByWeight) {
      setQtyModal(true);
    } else {
      if (onCart) onCart(); else add(item);
    }
  };

  const confirmWeight = () => {
    const val = parseInt(weight) || 25;
    if (onCart) onCart(val); else {
      // В контексте корзины qty — это множитель. 
      // Если товар по граммам, нам нужно либо добавить val штук, 
      // либо изменить логику корзины. Но проще добавить val штук.
      for(let i=0; i<val; i++) add(item);
    }
    setQtyModal(false);
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.imageBox, { backgroundColor: placeholder.bg }]}>
        {imageUri ? <Image source={{ uri: imageUri }} style={styles.image} /> : (
          <View style={styles.placeholderBox}>
            <View style={[styles.guschaOuter, { borderColor: placeholder.accent + '44' }]}><View style={[styles.guschaInner, { backgroundColor: placeholder.accent + '33' }]}><Text style={styles.placeholderEmoji}>{placeholder.emoji}</Text></View></View>
            <Text style={[styles.placeholderName, { color: placeholder.accent }]} numberOfLines={1}>{item.name?.split(' ').slice(0, 2).join(' ')}</Text>
          </View>
        )}
        {item.badge && <View style={[styles.badge, { backgroundColor: BADGE_COLORS[item.badge] || Colors.gold }]}><Text style={styles.badgeText}>{item.badge}</Text></View>}
        {token && !hideFav && (
          <TouchableOpacity style={styles.favBtn} onPress={toggleFav} disabled={favLoading} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name={fav ? 'heart' : 'heart-outline'} size={16} color={fav ? Colors.red : Colors.white} />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.sub} numberOfLines={1}>{item.category}{item.year ? ` · ${item.year}` : ''}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{Number(item.price).toLocaleString('ru')} ₽{isByWeight ? '/г' : '/Шт'}</Text>
          <TouchableOpacity style={styles.cartBtn} onPress={handleCartPress}>
            <Ionicons name="cart-outline" size={16} color={Colors.bg} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Модалка выбора веса */}
      <Modal visible={qtyModal} transparent animationType="fade" onRequestClose={() => setQtyModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Сколько грамм?</Text>
            <Text style={styles.modalSub}>{item.name}</Text>
            <View style={styles.inputRow}>
              <TouchableOpacity onPress={() => setWeight(Math.max(1, (parseInt(weight)||0)-5).toString())} style={styles.stepBtn}>
                <Ionicons name="remove" size={20} color={Colors.gold} />
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                value={weight}
                onChangeText={setWeight}
                keyboardType="number-pad"
                autoFocus
              />
              <TouchableOpacity onPress={() => setWeight(((parseInt(weight)||0)+5).toString())} style={styles.stepBtn}>
                <Ionicons name="add" size={20} color={Colors.gold} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setQtyModal(false)}>
                <Text style={styles.cancelText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={confirmWeight}>
                <Text style={styles.confirmText}>В корзину</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.card, borderRadius: 16, overflow: 'hidden', flex: 1, margin: 4 },
  imageBox: { position: 'relative', aspectRatio: 1 },
  image: { width: '100%', height: '100%' },
  placeholderBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 8, gap: 6 },
  guschaOuter: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  guschaInner: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  placeholderEmoji: { fontSize: 24 },
  placeholderName: { fontSize: 9, fontWeight: '600', textAlign: 'center', letterSpacing: 0.3 },
  badge: { position: 'absolute', top: 8, left: 8, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20 },
  badgeText: { color: Colors.bg, fontSize: 10, fontWeight: '700' },
  favBtn: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  info: { padding: 10 },
  name: { color: Colors.white, fontSize: 13, fontWeight: '600', marginBottom: 2, lineHeight: 17 },
  sub: { color: Colors.gray, fontSize: 10, marginBottom: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  price: { color: Colors.gold, fontSize: 14, fontWeight: '700' },
  cartBtn: { backgroundColor: Colors.gold, borderRadius: 18, width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: Colors.card, borderRadius: 24, padding: 24, width: '100%', maxWidth: 300, borderColor: Colors.border, borderWidth: 1 },
  modalTitle: { color: Colors.white, fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  modalSub: { color: Colors.gray, fontSize: 13, textAlign: 'center', marginBottom: 20 },
  inputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 24 },
  stepBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.cardAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  input: { color: Colors.gold, fontSize: 32, fontWeight: '800', textAlign: 'center', width: 80 },
  modalBtns: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  cancelText: { color: Colors.gray, fontWeight: '600' },
  confirmBtn: { flex: 2, backgroundColor: Colors.gold, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  confirmText: { color: Colors.bg, fontWeight: '700' },
});
