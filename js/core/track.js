/* Gửi sự kiện tới Google Analytics 4 và Meta Pixel (nếu admin đã gắn mã) */
const ga = (...a) => typeof window.gtag === 'function' && window.gtag(...a);
const fb = (...a) => typeof window.fbq === 'function' && window.fbq(...a);

const item = (p, v, qty = 1) => ({
  item_id: 'AU-' + String(p.id ?? p.productId).padStart(4, '0'), item_name: p.name,
  item_category: p.category_name || '', item_variant: v?.variant_name || '', price: v?.price ?? p.price, quantity: qty
});

export const Track = {
  viewItem(p) {
    ga('event', 'view_item', { currency: 'VND', value: p.price, items: [item(p)] });
    fb('track', 'ViewContent', { content_ids: [String(p.id)], content_name: p.name, content_type: 'product', value: p.price, currency: 'VND' });
  },
  addToCart(p, v, qty) {
    ga('event', 'add_to_cart', { currency: 'VND', value: v.price * qty, items: [item(p, v, qty)] });
    fb('track', 'AddToCart', { content_ids: [String(p.id)], content_type: 'product', value: v.price * qty, currency: 'VND' });
  },
  purchase(order) {
    const items = order.details.map(d => ({ item_id: 'AU-' + String(d.product_id).padStart(4, '0'), item_name: d.product_name, item_variant: d.variant_name, price: d.unit_price, quantity: d.quantity }));
    ga('event', 'purchase', { transaction_id: order.code, currency: 'VND', value: order.total, shipping: order.shipping, items });
    fb('track', 'Purchase', { value: order.total, currency: 'VND', content_ids: order.details.map(d => String(d.product_id)), content_type: 'product' });
  },
  search(term) {
    ga('event', 'search', { search_term: term });
    fb('track', 'Search', { search_string: term });
  },
  share(method, url) { ga('event', 'share', { method, item_id: url }); },
  contact(channel) { ga('event', 'generate_lead', { method: channel }); fb('track', 'Contact'); }
};
