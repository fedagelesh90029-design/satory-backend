import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
  Dimensions, ActivityIndicator, FlatList, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { apiFetch, MEDIA_BASE } from '../constants/api';
import { Colors } from '../constants/theme';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { add } = useCart();
  const { token } = useAuth();
  const goBack = () => { if (router.canGoBack()) router.back(); else router.replace('/(tabs)/catalog'); };

  const [product, setProduct]     = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [fav, setFav]             = useState(false);
  const [lightbox, setLightbox]   = useState<number | null>(null);
  const [activeImg, setActiveImg] = useState(0);
  const [display, setDisplay]     = useState<any>({});

  const [teas, setTeas]           = useState<any[]>([]);
  const [teaModal, setTeaModal]   = useState(false);
  const [selectedTea, setSelectedTea] = useState<any>(null);
  const [favLoading, setFavLoading] = useState(false);
  const [teaSubCat, setTeaSubCat] = useState('Все');

  const TEA_GROUPS = [
    { id: 'Все', label: 'Все' },
    { id: 'Белый', label: 'Белый' },
    { id: 'Улун', label: 'Улун' },
    { id: 'ГАБА', label: 'ГАБА' },
    { id: 'Красный', label: 'Красный' },
    { id: 'Чёрный', label: 'Чёрный' },
    { id: 'Шу', label: 'Шу' },
    { id: 'Шэн', label: 'Шэн' },
    { id: 'Травы', label: 'Травы' },
    { id: 'Другое', label: 'Другое' },
  ];

  const filteredTeas = teas.filter(t => {
    if (teaSubCat === 'Все') return true;
    const name = t.name.toLowerCase();
    const cat = (t.category || '').toLowerCase();
    
    const isGaba = name.includes('габа');
    const isShu = name.includes('шу') || (cat.includes('пуэр') && !name.includes('шэн') && !name.includes('шен'));
    const isSheng = name.includes('шэн') || name.includes('шен');
    const isWhite = cat.includes('белый') || name.includes('белый');
    const isRed = cat.includes('красный') || name.includes('красный');
    const isBlack = (cat.includes('чёрный') || cat.includes('черный') || cat.includes('хэй ча') || name.includes('лю бао')) && !isShu;
    const isOolong = (cat.includes('улун') || cat.includes('тайвань') || cat.includes('уишань') || cat.includes('гуандун') || cat.includes('аньси') || name.includes('улун') || name.includes('да хун пао') || name.includes('те гуань инь')) && !isGaba;
    const isHerb = cat.includes('травы') || cat.includes('добавки') || name.includes('травы') || name.includes('ромашка') || name.includes('мята');
    // В "Другое" оставляем ТОЛЬКО зеленый чай и матчу
    const isGreenOrMatcha = cat.includes('зеленый') || cat.includes('зелёный') || cat.includes('матча') || name.includes('люй ча') || name.includes('лун цзин') || name.includes('матча') || name.includes('жемчужина') || name.includes('би ло чунь') || name.includes('мао фэн');

    if (teaSubCat === 'ГАБА') return isGaba;
    if (teaSubCat === 'Шу') return isShu && !isGaba;
    if (teaSubCat === 'Шэн') return isSheng && !isGaba;
    if (teaSubCat === 'Белый') return isWhite && !isGaba;
    if (teaSubCat === 'Красный') return isRed && !isGaba;
    if (teaSubCat === 'Чёрный') return isBlack && !isGaba;
    if (teaSubCat === 'Улун') return isOolong && !isGaba;
    if (teaSubCat === 'Травы') return isHerb && !isGaba;
    if (teaSubCat === 'Другое') return isGreenOrMatcha && !isShu && !isSheng && !isWhite && !isRed && !isBlack && !isOolong && !isHerb && !isGaba;
    
    return false;
  });

  useEffect(() => {
    if (!id) return;
    const fetchProduct = async () => {
      try {
        const [p, s, t] = await Promise.all([
          apiFetch(`/products/${id}`),
          apiFetch('/settings/display').catch(() => ({})),
          apiFetch('/products?teaOnly=1').catch(() => []),
        ]);
        setProduct(p);
        setDisplay(s);
        setTeas(t);

        // Check if favorited if token exists
        if (token) {
          const favorites = await apiFetch('/products/favorites/list', {}, token);
          const isFav = favorites.some((f: any) => (f._id || f.id) === id);
          setFav(isFav);
        }
      } catch (err) {
        console.error('Error fetching product:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id, token]);

  useEffect(() => {
    if (product && product.name.toLowerCase().includes('с собой') && !selectedTea) {
      setTeaModal(true);
    }
  }, [product]);

  const toggleFav = async () => {
    if (!token) {
      // Можно было бы редиректнуть на логин, но пока просто ничего не делаем
      return;
    }
    setFavLoading(true);
    try {
      const res = await apiFetch(`/products/${id}/favorite`, { method: 'POST' }, token);
      setFav(res.favorited);
    } catch (err) {
      console.error('Error toggling favorite:', err);
    } finally {
      setFavLoading(false);
    }
  };

  const onAddToCart = () => {
    if (product.name.toLowerCase().includes('с собой') && !selectedTea) {
      setTeaModal(true);
      return;
    }
    
    const options = selectedTea ? {
      tea_id: selectedTea._id,
      tea_name: selectedTea.name,
      tea_price: selectedTea.price,
    } : undefined;

    add(product, options);
    goBack();
  };

  if (!product) return (
    <View style={styles.center}>
      <Text style={{ color: Colors.gray }}>Товар не найден</Text>
    </View>
  );

  const totalPrice = selectedTea 
    ? product.price + (selectedTea.price * 6)
    : product.price;

  const meta = product.meta || {};

  // Собираем все изображения: основное + из мета
  const allImages: string[] = [];
  if (product.image_url) {
    allImages.push(product.image_url.startsWith('http')
      ? product.image_url : `${MEDIA_BASE}${product.image_url}`);
  }
  (meta.images || []).forEach((img: any) => {
    const u = img.url?.startsWith('http') ? img.url : `${MEDIA_BASE}${img.url}`;
    if (!allImages.includes(u)) allImages.push(u);
  });

  const placeholder = getPlaceholderColor(product);

  return (
    <View style={styles.container}>
      {/* Шапка */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack}>
          <Ionicons name="chevron-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.backBtn} onPress={toggleFav}>
          <Ionicons name={fav ? 'heart' : 'heart-outline'} size={20} color={fav ? Colors.red : Colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* Фото */}
        {allImages.length > 0 && display.show_images !== false ? (
          <View>
            <TouchableOpacity onPress={() => setLightbox(activeImg)} activeOpacity={0.95}>
              <Image source={{ uri: allImages[activeImg] }} style={styles.mainImage} resizeMode="cover" />
            </TouchableOpacity>
            {allImages.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.thumbRow}>
                {allImages.map((uri, i) => (
                  <TouchableOpacity key={i} onPress={() => setActiveImg(i)}>
                    <Image source={{ uri }} style={[styles.thumb, i === activeImg && styles.thumbActive]} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        ) : (
          <View style={[styles.mainImage, { backgroundColor: placeholder.bg, alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ fontSize: 64 }}>{placeholder.emoji}</Text>
          </View>
        )}

        <View style={styles.body}>
          {/* Бейдж + категория */}
          <View style={styles.tagRow}>
            {product.badge && (
              <View style={[styles.badge, { backgroundColor: Colors.gold }]}>
                <Text style={styles.badgeText}>{product.badge}</Text>
              </View>
            )}
            {display.show_category !== false && <Text style={styles.category}>{product.category}</Text>}
            {display.show_origin !== false && meta.origin ? <Text style={styles.origin}>📍 {meta.origin}</Text> : null}
          </View>

          {/* Название */}
          <Text style={styles.name}>{product.name}</Text>

          {/* Рейтинг */}
          {product.rating > 0 && (
            <View style={styles.ratingRow}>
              {[1,2,3,4,5].map(s => (
                <Ionicons key={s} name={s <= Math.round(product.rating) ? 'star' : 'star-outline'}
                  size={14} color={Colors.gold} />
              ))}
              <Text style={styles.ratingText}>{product.rating} · {product.reviews_count} отзывов</Text>
            </View>
          )}

          {/* Краткое описание */}
          {product.description ? (
            <Text style={styles.shortDesc}>{product.description}</Text>
          ) : null}

          {/* Характеристики */}
          {(product.year || product.weight || display.show_price !== false) ? (
          <View style={styles.specsCard}>
            {display.show_price !== false && (
              <SpecRow icon="pricetag-outline" label="Цена" value={`${Number(product.price).toLocaleString('ru')} ₽`} />
            )}
            {display.show_price !== false && product.weight && (() => {
              // Считаем цену за грамм если вес указан в граммах
              const match = String(product.weight).match(/(\d+)/);
              if (match) {
                const grams = Number(match[1]);
                const perGram = (product.price / grams).toFixed(1);
                return <SpecRow icon="leaf-outline" label="За 1 г" value={`${perGram} ₽`} />;
              }
              return null;
            })()}
            {product.year ? <SpecRow icon="calendar-outline" label="Год сбора" value={String(product.year)} /> : null}
            {product.weight ? <SpecRow icon="scale-outline" label="Вес" value={product.weight} /> : null}
          </View>
          ) : null}

          {/* Советы по завариванию */}
          {display.show_brewing_tips !== false && meta.brewing_tips ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Как заваривать</Text>
              <Text style={styles.sectionText}>{meta.brewing_tips}</Text>
            </View>
          ) : null}

          {/* Полное описание */}
          {display.show_full_description !== false && meta.full_description ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>О товаре</Text>
              <Text style={styles.sectionText}>{meta.full_description.replace(/<[^>]+>/g, '')}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Нижняя панель — цена + корзина */}
      {display.show_price !== false && (
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.priceLabel}>{selectedTea ? 'Итоговая цена' : 'Цена'}</Text>
          <Text style={styles.price}>{Number(totalPrice).toLocaleString('ru')} ₽</Text>
        </View>
        <TouchableOpacity style={styles.cartBtn} onPress={onAddToCart}>
          <Ionicons name="cart-outline" size={20} color={Colors.bg} />
          <Text style={styles.cartBtnText}>В корзину</Text>
        </TouchableOpacity>
      </View>
      )}

      {/* Выбор чая для "Чай с собой" */}
      <Modal visible={teaModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.teaSheet}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Выберите чай</Text>
                <Text style={styles.sheetSub}>Добавим 6 грамм к вашему заказу</Text>
              </View>
              <TouchableOpacity onPress={() => setTeaModal(false)}>
                <Ionicons name="close" size={24} color={Colors.gray} />
              </TouchableOpacity>
            </View>

            <View style={{ height: 60, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.groupScroll}>
                {TEA_GROUPS.map(g => (
                  <TouchableOpacity key={g.id} 
                    style={[styles.groupChip, teaSubCat === g.id && styles.groupChipActive]}
                    onPress={() => setTeaSubCat(g.id)}
                  >
                    <Text style={[styles.groupText, teaSubCat === g.id && styles.groupTextActive]}>{g.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <FlatList
              data={filteredTeas}
              keyExtractor={item => item._id}
              contentContainerStyle={{ padding: 20 }}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[styles.teaItem, selectedTea?._id === item._id && styles.teaItemActive]}
                  onPress={() => { setSelectedTea(item); setTeaModal(false); }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.teaItemName}>{item.name}</Text>
                    <Text style={styles.teaItemPrice}>{item.price} ₽ / г</Text>
                  </View>
                  <View style={styles.teaItemRight}>
                    <Text style={styles.teaItemTotal}>+ {item.price * 6} ₽</Text>
                    <Ionicons 
                      name={selectedTea?._id === item._id ? "radio-button-on" : "radio-button-off"} 
                      size={20} color={selectedTea?._id === item._id ? Colors.gold : Colors.gray} 
                    />
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Lightbox */}
      <Modal visible={lightbox !== null} transparent animationType="fade"
        onRequestClose={() => setLightbox(null)}>
        <View style={styles.lightbox}>
          <TouchableOpacity style={styles.lbClose} onPress={() => setLightbox(null)}>
            <Ionicons name="close" size={26} color={Colors.white} />
          </TouchableOpacity>
          {lightbox !== null && (
            <Image source={{ uri: allImages[lightbox] }} style={styles.lbImage} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </View>
  );
}

function SpecRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.specRow}>
      <Ionicons name={icon} size={15} color={Colors.gold} />
      <Text style={styles.specLabel}>{label}</Text>
      <Text style={styles.specValue}>{value}</Text>
    </View>
  );
}

function getPlaceholderColor(item: any) {
  const name = (item.name || '').toLowerCase();
  const cat  = (item.category || '').toLowerCase();
  if (cat === 'посуда' || name.includes('чайник')) return { emoji: '🫖', bg: '#2A1F14' };
  if (cat.includes('шу'))   return { emoji: '🟤', bg: '#1A0A0A' };
  if (cat.includes('шэн'))  return { emoji: '🟢', bg: '#0A1A0A' };
  if (cat.includes('улун')) return { emoji: '🌿', bg: '#1A1500' };
  if (cat.includes('белый')) return { emoji: '🌸', bg: '#1A1520' };
  return { emoji: '🍵', bg: '#0F0F0A' };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  center: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
  topBar: {
    position: 'absolute', top: 52, left: 0, right: 0, zIndex: 10,
    flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center',
  },
  mainImage: { width, height: width * 0.85 },
  thumbRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  thumb: { width: 60, height: 60, borderRadius: 10, borderWidth: 2, borderColor: 'transparent' },
  thumbActive: { borderColor: Colors.gold },
  body: { padding: 20 },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { color: Colors.bg, fontSize: 10, fontWeight: '700' },
  category: { color: Colors.gold, fontSize: 12, fontWeight: '600' },
  origin: { color: Colors.gray, fontSize: 12 },
  name: { color: Colors.white, fontSize: 24, fontWeight: '700', marginBottom: 10, lineHeight: 30 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  ratingText: { color: Colors.gray, fontSize: 12, marginLeft: 4 },
  shortDesc: { color: Colors.grayLight, fontSize: 14, lineHeight: 21, marginBottom: 16 },
  specsCard: {
    backgroundColor: Colors.card, borderRadius: 14, padding: 16,
    marginBottom: 16, gap: 10,
  },
  specRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  specLabel: { color: Colors.gray, fontSize: 13, flex: 1 },
  specValue: { color: Colors.white, fontSize: 13, fontWeight: '600' },
  section: { marginBottom: 16 },
  sectionTitle: { color: Colors.white, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  sectionText: { color: Colors.grayLight, fontSize: 14, lineHeight: 22 },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.card, borderTopWidth: 1, borderTopColor: Colors.border,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 32,
  },
  priceLabel: { color: Colors.gray, fontSize: 12, marginBottom: 2 },
  price: { color: Colors.gold, fontSize: 22, fontWeight: '700' },
  cartBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.gold, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16,
  },
  cartBtnText: { color: Colors.bg, fontSize: 15, fontWeight: '700' },
  lightbox: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', alignItems: 'center', justifyContent: 'center' },
  lbClose: {
    position: 'absolute', top: 52, right: 20,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  lbImage: { width, height: width * 1.2 },
  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  teaSheet: { backgroundColor: Colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.border },
  sheetTitle: { color: Colors.white, fontSize: 18, fontWeight: '700' },
  sheetSub: { color: Colors.gray, fontSize: 13 },
  teaItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: Colors.border },
  teaItemActive: { backgroundColor: 'rgba(212,175,55,0.05)' },
  teaItemName: { color: Colors.white, fontSize: 15, fontWeight: '600' },
  teaItemPrice: { color: Colors.gray, fontSize: 12 },
  teaItemRight: { alignItems: 'flex-end', gap: 4 },
  teaItemTotal: { color: Colors.gold, fontSize: 14, fontWeight: '700' },
  groupScroll: { paddingHorizontal: 20, alignItems: 'center', gap: 10 },
  groupChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.border, borderWidth: 1, borderColor: 'transparent',
  },
  groupChipActive: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  groupText: { color: Colors.gray, fontSize: 13, fontWeight: '600' },
  groupTextActive: { color: Colors.bg },
});
