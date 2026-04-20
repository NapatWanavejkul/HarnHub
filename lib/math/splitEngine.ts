// lib/math/splitEngine.ts
import { BillItem } from '@/types/bill';

export const calculateTotals = (
  items: BillItem[],
  serviceCharge: number = 10,
  vat: number = 7,
  discount: number = 0
) => {
  const memberTotals: Record<string, number> = {};
  
  const totalSubtotal = items.reduce((sum, item) => sum + item.price, 0);

  items.forEach((item) => {
    if (item.consumedBy.length === 0) return;
    const pricePerPerson = item.price / item.consumedBy.length;

    item.consumedBy.forEach((memberId) => {
      if (!memberTotals[memberId]) memberTotals[memberId] = 0;
      memberTotals[memberId] += pricePerPerson;
    });
  });

  return Object.entries(memberTotals).map(([id, rawSubtotal]) => {
    const proportion = totalSubtotal > 0 ? (rawSubtotal / totalSubtotal) : 0;
    const itemDiscount = proportion * discount;
    const discountedAmount = Math.max(0, rawSubtotal - itemDiscount);

    const withSC = discountedAmount * (1 + serviceCharge / 100);
    const withVAT = withSC * (1 + vat / 100);
    return {
      id,
      total: Math.round(withVAT * 100) / 100,
    };
  }).sort((a, b) => a.id.localeCompare(b.id));
};