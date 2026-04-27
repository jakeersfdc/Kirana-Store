import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// ----------------- Config -----------------
const API_URL =
  Constants.expoConfig?.extra?.API_URL ||
  Constants.manifest?.extra?.API_URL ||
  'http://10.0.2.2:4000'; // Android emulator -> host

const API = `${API_URL}/api/v1/public`;

const COLORS = {
  green: '#0c831f',
  greenDark: '#0a6b19',
  yellow: '#f8cb46',
  bg: '#f6f7f9',
  card: '#ffffff',
  text: '#1c1c1c',
  muted: '#6b7280',
  border: '#ececec',
  danger: '#e02424',
};

const INR = (n) => '₹' + Math.round(Number(n || 0));
const EMOJI = {
  Grains: '🌾', Pulses: '🫘', Sweeteners: '🍬', Dairy: '🥛',
  Oil: '🫒', Snacks: '🍪', Beverages: '🥤', Fruits: '🍎',
  Vegetables: '🥦', Bakery: '🍞', 'Personal Care': '🧴', Household: '🧹',
};
const cemoji = (c) => EMOJI[c] || '🛒';

// ----------------- App -----------------
export default function App() {
  const [stores, setStores] = useState([]);
  const [storeId, setStoreId] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState(null);
  const [cart, setCart] = useState({});
  const [showCart, setShowCart] = useState(false);
  const [step, setStep] = useState('cart'); // cart | checkout | success
  const [lastOrder, setLastOrder] = useState(null);
  const [storePicker, setStorePicker] = useState(false);
  const [error, setError] = useState(null);

  // checkout form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [delivery, setDelivery] = useState('DELIVERY');
  const [payment, setPayment] = useState('CASH');
  const [placing, setPlacing] = useState(false);

  // ---- Load on mount ----
  useEffect(() => { boot(); }, []);
  useEffect(() => { if (storeId) loadCatalogue(); }, [storeId]);

  async function boot() {
    try {
      setError(null);
      const r = await fetch(`${API}/stores`);
      const j = await r.json();
      if (!j.success || !j.data?.length) {
        setError('No stores available right now.');
        setLoading(false);
        return;
      }
      setStores(j.data);
      const saved = await AsyncStorage.getItem('storeId');
      const sid = j.data.find((s) => s.id === saved)?.id || j.data[0].id;
      setStoreId(sid);
      await AsyncStorage.setItem('storeId', sid);
      const cartRaw = await AsyncStorage.getItem('cart_' + sid);
      setCart(cartRaw ? JSON.parse(cartRaw) : {});
    } catch (e) {
      setError(`Could not connect to ${API_URL}. Is the API running?`);
      setLoading(false);
    }
  }

  async function loadCatalogue() {
    setLoading(true);
    try {
      const [pr, cr] = await Promise.all([
        fetch(`${API}/stores/${storeId}/products`).then((r) => r.json()),
        fetch(`${API}/stores/${storeId}/categories`).then((r) => r.json()),
      ]);
      setProducts(pr.data || []);
      setCategories(cr.data || []);
      setError(null);
    } catch (e) {
      setError('Failed to load products.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function pickStore(id) {
    setStoreId(id);
    setStorePicker(false);
    await AsyncStorage.setItem('storeId', id);
    const cartRaw = await AsyncStorage.getItem('cart_' + id);
    setCart(cartRaw ? JSON.parse(cartRaw) : {});
  }

  // ---- Cart ops ----
  const cartItems = Object.values(cart);
  const cartCount = cartItems.reduce((n, i) => n + i.qty, 0);
  const subtotal = cartItems.reduce((n, i) => n + i.qty * Number(i.product.price), 0);
  const deliveryCharge = delivery === 'DELIVERY' && subtotal < 299 ? 25 : 0;
  const total = subtotal + deliveryCharge;

  async function persistCart(c) {
    if (!storeId) return;
    await AsyncStorage.setItem('cart_' + storeId, JSON.stringify(c));
  }
  function changeQty(p, delta) {
    setCart((c) => {
      const cur = c[p.id]?.qty || 0;
      const next = cur + delta;
      const out = { ...c };
      if (next <= 0) delete out[p.id];
      else if (next > Number(p.stock)) {
        Alert.alert('Stock limit', `Only ${p.stock} ${p.unit || ''} available`);
        return c;
      } else out[p.id] = { product: p, qty: next };
      persistCart(out);
      return out;
    });
  }

  // ---- Filters ----
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (activeCat && p.category !== activeCat) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [products, search, activeCat]);

  // ---- Place order ----
  async function placeOrder() {
    if (!name.trim()) return Alert.alert('Required', 'Please enter your name');
    if (!/^\+?\d{10,15}$/.test(phone.replace(/\s/g, ''))) return Alert.alert('Invalid phone', 'Enter a valid phone number');
    if (delivery === 'DELIVERY' && !address.trim()) return Alert.alert('Required', 'Enter delivery address');

    setPlacing(true);
    try {
      const items = cartItems.map((i) => ({ productId: i.product.id, quantity: i.qty }));
      const r = await fetch(`${API}/stores/${storeId}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: { name, phone, address },
          items,
          deliveryType: delivery,
          paymentMethod: payment,
          deliveryCharge,
          notes,
        }),
      });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.message || 'Order failed');
      setLastOrder(j.data);
      setCart({}); persistCart({});
      setStep('success');
      loadCatalogue();
    } catch (e) {
      Alert.alert('Order failed', e.message);
    } finally {
      setPlacing(false);
    }
  }

  const store = stores.find((s) => s.id === storeId);

  // ----------------- UI -----------------
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.yellow} />

      {/* Top bar */}
      <View style={s.topbar}>
        <View style={s.topRow}>
          <View style={s.mins}><Text style={s.minsT}>10 mins</Text></View>
          <Text style={s.deliveryT}>Delivery to your doorstep</Text>
        </View>
        <Pressable onPress={() => setStorePicker(true)} style={{ marginTop: 4 }}>
          <Text style={s.storeT}>📍 {store?.name || 'Loading…'} ▾</Text>
        </Pressable>
        <View style={s.search}>
          <Text style={{ color: COLORS.muted, marginRight: 6 }}>🔍</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder='Search "rice", "milk"…'
            placeholderTextColor={COLORS.muted}
            style={{ flex: 1, fontSize: 15, color: COLORS.text }}
          />
        </View>
      </View>

      {/* Body */}
      {error ? (
        <View style={s.center}><Text style={{ fontSize: 40 }}>⚠️</Text><Text style={{ color: COLORS.muted, marginTop: 8, textAlign: 'center', paddingHorizontal: 30 }}>{error}</Text>
          <Pressable onPress={boot} style={s.retryBtn}><Text style={{ color: '#fff', fontWeight: '700' }}>Retry</Text></Pressable>
        </View>
      ) : loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={COLORS.green} /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{ padding: 8, paddingBottom: 110 }}
          columnWrapperStyle={{ gap: 8 }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          ListHeaderComponent={
            <>
              <View style={s.hero}>
                <Text style={s.heroT}>Fresh groceries, delivered fast</Text>
                <Text style={s.heroS}>Paisa vasool prices from your trusted Kirana 🛒</Text>
              </View>
              <Text style={s.sectionT}>Shop by category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 8 }}>
                <Chip label="All" active={!activeCat} onPress={() => setActiveCat(null)} />
                {categories.map((c) => (
                  <Chip key={c} label={`${cemoji(c)} ${c}`} active={activeCat === c} onPress={() => setActiveCat(c)} />
                ))}
              </ScrollView>
              <Text style={s.sectionT}>{activeCat || (search ? 'Search results' : 'All products')}</Text>
            </>
          }
          ListEmptyComponent={
            <View style={s.center}><Text style={{ fontSize: 40 }}>🔍</Text><Text style={{ color: COLORS.muted, marginTop: 8 }}>No products found.</Text></View>
          }
          renderItem={({ item }) => (
            <ProductCard p={item} qty={cart[item.id]?.qty || 0} onAdd={() => changeQty(item, 1)} onMinus={() => changeQty(item, -1)} />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadCatalogue(); }} tintColor={COLORS.green} />}
        />
      )}

      {/* Floating cart bar */}
      {cartCount > 0 && (
        <Pressable style={s.cartbar} onPress={() => { setStep('cart'); setShowCart(true); }}>
          <View>
            <Text style={{ color: '#fff', fontSize: 13 }}>{cartCount} item{cartCount > 1 ? 's' : ''}</Text>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{INR(subtotal)}</Text>
          </View>
          <View style={s.viewBtn}><Text style={{ color: COLORS.green, fontWeight: '700' }}>View cart →</Text></View>
        </Pressable>
      )}

      {/* Store picker */}
      <Modal visible={storePicker} transparent animationType="slide" onRequestClose={() => setStorePicker(false)}>
        <Pressable style={s.modalBg} onPress={() => setStorePicker(false)}>
          <Pressable style={s.sheet} onPress={() => {}}>
            <Text style={s.sheetT}>Choose store</Text>
            {stores.map((st) => (
              <Pressable key={st.id} onPress={() => pickStore(st.id)} style={[s.storeRow, st.id === storeId && { borderColor: COLORS.green, backgroundColor: '#f0fdf4' }]}>
                <Text style={{ fontSize: 22 }}>🏪</Text>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={{ fontWeight: '700' }}>{st.name}</Text>
                  <Text style={{ color: COLORS.muted, fontSize: 12 }}>{st.address}</Text>
                </View>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Cart / Checkout */}
      <Modal visible={showCart} animationType="slide" onRequestClose={() => setShowCart(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
            <View style={s.drawerHead}>
              <Text style={{ fontWeight: '700', fontSize: 17 }}>
                {step === 'success' ? 'Order placed' : step === 'checkout' ? 'Delivery details' : `Your cart (${cartCount})`}
              </Text>
              <Pressable onPress={() => setShowCart(false)}><Text style={{ fontSize: 22, color: '#666' }}>✕</Text></Pressable>
            </View>

            {step === 'success' ? (
              <View style={[s.center, { padding: 30 }]}>
                <View style={s.checkCircle}><Text style={{ fontSize: 38 }}>✓</Text></View>
                <Text style={{ fontSize: 22, fontWeight: '700', marginTop: 14 }}>Order placed!</Text>
                <Text style={{ color: '#666', marginTop: 4, textAlign: 'center' }}>The shop will call you shortly to confirm.</Text>
                <View style={s.ord}><Text style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>Order: {lastOrder?.orderNumber}</Text></View>
                <Text style={{ color: '#666', marginTop: 4 }}>Total: <Text style={{ fontWeight: '700' }}>{INR(lastOrder?.total)}</Text></Text>
                <Pressable style={[s.primaryBtn, { marginTop: 30, width: '100%' }]} onPress={() => { setShowCart(false); setStep('cart'); setName(''); setPhone(''); setAddress(''); setNotes(''); }}>
                  <Text style={s.primaryBtnT}>Continue shopping</Text>
                </Pressable>
              </View>
            ) : cartItems.length === 0 ? (
              <View style={[s.center, { flex: 1 }]}>
                <Text style={{ fontSize: 60 }}>🛒</Text>
                <Text style={{ color: COLORS.muted, marginTop: 8 }}>Your cart is empty.</Text>
              </View>
            ) : step === 'cart' ? (
              <>
                <ScrollView style={{ flex: 1, paddingHorizontal: 16 }}>
                  {cartItems.map((i) => (
                    <View key={i.product.id} style={s.line}>
                      <View style={s.thumb}><Text style={{ fontSize: 20 }}>{cemoji(i.product.category)}</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: '600' }} numberOfLines={1}>{i.product.name}</Text>
                        <Text style={{ color: COLORS.muted, fontSize: 12 }}>{INR(i.product.price)} × {i.qty}</Text>
                      </View>
                      <Stepper qty={i.qty} onPlus={() => changeQty(i.product, 1)} onMinus={() => changeQty(i.product, -1)} />
                    </View>
                  ))}
                </ScrollView>
                <View style={s.foot}>
                  <Row k="Item total" v={INR(subtotal)} />
                  <Row k="Delivery" v={subtotal >= 299 ? 'FREE' : INR(25)} />
                  <Row k="To pay" v={INR(subtotal + (subtotal >= 299 ? 0 : 25))} bold />
                  {subtotal < 299 && <Text style={{ fontSize: 12, color: COLORS.muted, marginVertical: 6 }}>Add {INR(299 - subtotal)} for free delivery</Text>}
                  <Pressable style={s.primaryBtn} onPress={() => setStep('checkout')}>
                    <Text style={s.primaryBtnT}>Proceed to checkout · {INR(subtotal + (subtotal >= 299 ? 0 : 25))}</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <ScrollView style={{ flex: 1, padding: 16 }} keyboardShouldPersistTaps="handled">
                  <Field label="Your name *" value={name} onChangeText={setName} placeholder="Full name" />
                  <Field label="Phone number *" value={phone} onChangeText={setPhone} placeholder="+91 9876543210" keyboardType="phone-pad" />

                  <Text style={s.label}>Delivery type</Text>
                  <View style={s.toggle}>
                    <ToggleBtn label="🛵 Home delivery" active={delivery === 'DELIVERY'} onPress={() => setDelivery('DELIVERY')} />
                    <ToggleBtn label="🏪 Pickup" active={delivery === 'PICKUP'} onPress={() => setDelivery('PICKUP')} />
                  </View>

                  {delivery === 'DELIVERY' && (
                    <Field label="Delivery address *" value={address} onChangeText={setAddress} placeholder="House, street, area, pincode" multiline />
                  )}

                  <Text style={s.label}>Payment</Text>
                  <View style={s.toggle}>
                    <ToggleBtn label="💵 Cash on delivery" active={payment === 'CASH'} onPress={() => setPayment('CASH')} />
                    <ToggleBtn label="📱 UPI on delivery" active={payment === 'UPI'} onPress={() => setPayment('UPI')} />
                  </View>

                  <Field label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="e.g. ring the bell twice" />
                </ScrollView>
                <View style={s.foot}>
                  <Row k="To pay" v={INR(total)} bold />
                  <Pressable style={[s.primaryBtn, placing && { opacity: 0.7 }]} disabled={placing} onPress={placeOrder}>
                    {placing ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnT}>Place order</Text>}
                  </Pressable>
                  <Pressable onPress={() => setStep('cart')} style={{ padding: 10 }}>
                    <Text style={{ color: COLORS.muted, textAlign: 'center', fontSize: 13 }}>← Back to cart</Text>
                  </Pressable>
                </View>
              </>
            )}
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ----------------- Components -----------------
function Chip({ label, active, onPress }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, active && { backgroundColor: COLORS.green, borderColor: COLORS.green }]}>
      <Text style={[s.chipT, active && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

function Stepper({ qty, onPlus, onMinus }) {
  return (
    <View style={s.stepper}>
      <Pressable onPress={onMinus} style={s.stepBtn}><Text style={s.stepT}>−</Text></Pressable>
      <Text style={[s.stepT, { paddingHorizontal: 8, minWidth: 22, textAlign: 'center' }]}>{qty}</Text>
      <Pressable onPress={onPlus} style={s.stepBtn}><Text style={s.stepT}>+</Text></Pressable>
    </View>
  );
}

function ProductCard({ p, qty, onAdd, onMinus }) {
  const stock = Number(p.stock);
  const out = stock <= 0;
  const low = stock > 0 && stock <= 5;
  return (
    <View style={s.card}>
      {out ? <View style={[s.badge, s.badgeOut]}><Text style={s.badgeT}>Out</Text></View>
        : low ? <View style={s.badge}><Text style={s.badgeT}>Only {stock} left</Text></View> : null}
      <View style={s.imgBox}><Text style={{ fontSize: 40 }}>{cemoji(p.category)}</Text></View>
      <Text style={s.name} numberOfLines={2}>{p.name}</Text>
      <Text style={s.unit}>{p.unit || 'unit'} · {p.category || ''}</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
        <View>
          <Text style={s.price}>{INR(p.price)}</Text>
          {p.mrp && Number(p.mrp) > Number(p.price) ? <Text style={s.mrp}>{INR(p.mrp)}</Text> : null}
        </View>
        {out ? (
          <View style={[s.addBtn, { borderColor: '#ccc' }]}><Text style={[s.addBtnT, { color: '#999' }]}>Out</Text></View>
        ) : qty > 0 ? (
          <Stepper qty={qty} onPlus={onAdd} onMinus={onMinus} />
        ) : (
          <Pressable style={s.addBtn} onPress={onAdd}><Text style={s.addBtnT}>ADD</Text></Pressable>
        )}
      </View>
    </View>
  );
}

function Row({ k, v, bold }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
      <Text style={{ fontSize: bold ? 16 : 14, fontWeight: bold ? '700' : '400' }}>{k}</Text>
      <Text style={{ fontSize: bold ? 16 : 14, fontWeight: bold ? '700' : '400' }}>{v}</Text>
    </View>
  );
}

function Field({ label, ...props }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput style={s.input} placeholderTextColor={COLORS.muted} {...props} />
    </View>
  );
}

function ToggleBtn({ label, active, onPress }) {
  return (
    <Pressable style={[s.tBtn, active && { backgroundColor: COLORS.green, borderColor: COLORS.green }]} onPress={onPress}>
      <Text style={{ color: active ? '#fff' : COLORS.text, fontSize: 13, fontWeight: '500' }}>{label}</Text>
    </Pressable>
  );
}

// ----------------- Styles -----------------
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  topbar: { backgroundColor: COLORS.yellow, paddingHorizontal: 16, paddingVertical: 12 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mins: { backgroundColor: '#000', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  minsT: { color: '#fff', fontSize: 11, fontWeight: '700' },
  deliveryT: { fontWeight: '700', fontSize: 15 },
  storeT: { fontSize: 13, color: '#333', fontWeight: '500' },
  search: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, marginTop: 10 },

  hero: { backgroundColor: COLORS.green, padding: 18, borderRadius: 14, marginVertical: 8 },
  heroT: { color: '#fff', fontSize: 18, fontWeight: '700' },
  heroS: { color: '#fff', opacity: 0.9, marginTop: 4, fontSize: 12 },

  sectionT: { fontWeight: '700', fontSize: 15, marginVertical: 8, paddingHorizontal: 4 },

  chip: { paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  chipT: { fontSize: 13, fontWeight: '500' },

  card: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 10, borderWidth: 1, borderColor: COLORS.border, minHeight: 230 },
  imgBox: { width: '100%', aspectRatio: 1, backgroundColor: '#f1f5f0', borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  name: { fontSize: 13, fontWeight: '600', minHeight: 32 },
  unit: { fontSize: 11, color: COLORS.muted, marginTop: 2, marginBottom: 6 },
  price: { fontWeight: '700', fontSize: 14 },
  mrp: { fontSize: 11, color: COLORS.muted, textDecorationLine: 'line-through' },
  badge: { position: 'absolute', top: 6, left: 6, backgroundColor: '#fde68a', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, zIndex: 1 },
  badgeOut: { backgroundColor: '#fecaca' },
  badgeT: { fontSize: 10, fontWeight: '700', color: '#854d0e' },

  addBtn: { borderWidth: 1.5, borderColor: COLORS.green, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
  addBtnT: { color: COLORS.green, fontWeight: '700', fontSize: 13 },

  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.green, borderRadius: 8, overflow: 'hidden' },
  stepBtn: { paddingHorizontal: 10, paddingVertical: 5 },
  stepT: { color: '#fff', fontWeight: '700', fontSize: 14 },

  cartbar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: COLORS.green, padding: 14, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  viewBtn: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 8 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  retryBtn: { marginTop: 16, backgroundColor: COLORS.green, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },

  drawerHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: COLORS.border },
  line: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border, gap: 10 },
  thumb: { width: 44, height: 44, backgroundColor: '#f1f5f0', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  foot: { padding: 16, backgroundColor: '#fafafa', borderTopWidth: 1, borderColor: COLORS.border },
  primaryBtn: { backgroundColor: COLORS.green, padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 6 },
  primaryBtnT: { color: '#fff', fontWeight: '700', fontSize: 15 },

  label: { fontSize: 12, color: COLORS.muted, fontWeight: '500', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 11, fontSize: 14, color: COLORS.text, backgroundColor: '#fff' },
  toggle: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  tBtn: { flex: 1, padding: 11, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, alignItems: 'center', backgroundColor: '#fff' },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 30 },
  sheetT: { fontWeight: '700', fontSize: 17, marginBottom: 12 },
  storeRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, marginBottom: 8 },

  checkCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' },
  ord: { backgroundColor: COLORS.bg, padding: 10, borderRadius: 8, marginTop: 14 },
});
