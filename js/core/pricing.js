/* =========================================================
   AURUM UNIFORM – Quy tắc tính tiền (DÙNG CHUNG client + server)
   Chỉ chứa hàm thuần, không đụng tới DOM nên Node.js import được.
   ========================================================= */

export const CONFIG = Object.freeze({
  printFee: 15000,            // phí in / thêu cho mỗi áo có in
  freeShipFrom: 2000000,      // miễn phí vận chuyển từ mức này
  shippingFee: 30000,
  wholesale: [                // giá sỉ theo tổng số lượng của từng mẫu áo
    { min: 100, rate: 0.15, label: 'Từ 100 áo' },
    { min: 50,  rate: 0.10, label: '50 – 99 áo' },
    { min: 20,  rate: 0.05, label: '20 – 49 áo' }
  ],
  bank: { name: 'Vietcombank', number: '0123 456 789', owner: 'CONG TY TNHH AURUM UNIFORM' }
});

export const COUPONS = Object.freeze({
  AURUM50K: { label: 'Giảm 50.000₫ cho đơn từ 1.000.000₫', calc: base => (base >= 1000000 ? 50000 : 0) },
  WELCOME:  { label: 'Giảm 5% (tối đa 100.000₫)',          calc: base => Math.min(100000, Math.round(base * 0.05)) }
});

export const ORDER_STATUS = Object.freeze({
  pending:   { label: 'Chờ xác nhận', cls: 'st-pending' },
  confirmed: { label: 'Đã xác nhận',  cls: 'st-confirmed' },
  shipping:  { label: 'Đang giao',    cls: 'st-shipping' },
  completed: { label: 'Hoàn thành',   cls: 'st-completed' },
  cancelled: { label: 'Đã huỷ',       cls: 'st-cancelled' }
});

export const PAYMENT_METHODS = Object.freeze({
  cod:     'Thanh toán khi nhận hàng (COD)',
  bank:    'Chuyển khoản ngân hàng',
  ewallet: 'Ví điện tử (MoMo / ZaloPay)'
});

export const wholesaleRate = qty => {
  const tier = CONFIG.wholesale.find(t => qty >= t.min);
  return tier ? tier.rate : 0;
};

export const hasPrint = print => !!(print && (print.text || print.logo));

/**
 * @param {{productId:number, price:number, qty:number, print?:object|null}[]} items
 * @returns {{subtotal:number, discount:number, printFee:number, shipping:number, totalQty:number, total:number}}
 */
export function calcTotals(items) {
  const qtyByProduct = {};
  items.forEach(({ productId, qty }) => { qtyByProduct[productId] = (qtyByProduct[productId] || 0) + qty; });

  let subtotal = 0, discount = 0, printFee = 0, totalQty = 0;
  for (const { productId, price, qty, print } of items) {
    const line = price * qty;
    subtotal += line;
    discount += Math.round(line * wholesaleRate(qtyByProduct[productId]));
    if (hasPrint(print)) printFee += CONFIG.printFee * qty;
    totalQty += qty;
  }
  const afterDiscount = subtotal - discount;
  const shipping = items.length === 0 || afterDiscount >= CONFIG.freeShipFrom ? 0 : CONFIG.shippingFee;
  return { subtotal, discount, printFee, shipping, totalQty, total: afterDiscount + printFee + shipping };
}

/** Số tiền mã giảm giá được áp cho đơn (0 nếu mã sai / chưa đủ điều kiện) */
export const couponAmount = (code, totals) => {
  const cp = COUPONS[String(code || '').toUpperCase()];
  return cp ? cp.calc(totals.subtotal - totals.discount) : 0;
};

/** Gắn mã giảm giá vào kết quả calcTotals */
export function withCoupon(totals, code) {
  const amount = code ? couponAmount(code, totals) : 0;
  if (!amount) return { ...totals, coupon: null };
  return { ...totals, coupon: { code: String(code).toUpperCase(), amount }, total: Math.max(0, totals.total - amount) };
}
