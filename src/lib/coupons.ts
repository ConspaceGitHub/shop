export interface Coupon {
  id: string;
  code: string;
  title: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  coupon_type: 'general' | 'birthday' | 'anniversary';
  starts_at: string;
  ends_at: string | null;
}

export function computeDiscount(coupon: Coupon, subtotal: number) {
  if (coupon.discount_type === 'percentage') {
    return Math.round(subtotal * (coupon.discount_value / 100));
  }
  return Math.min(coupon.discount_value, subtotal);
}

export function isCouponUsableNow(coupon: Coupon, now: Date = new Date()) {
  if (new Date(coupon.starts_at) > now) return false;
  if (coupon.ends_at && new Date(coupon.ends_at) < now) return false;
  return true;
}

export function isCouponEligibleForMember(
  coupon: Coupon,
  member: { birthday: string } | null,
  now: Date = new Date()
) {
  if (coupon.coupon_type !== 'birthday') return true;
  if (!member) return false;
  return new Date(member.birthday).getMonth() === now.getMonth();
}
