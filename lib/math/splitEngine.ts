// lib/math/splitEngine.ts
import { BillItem } from '@/types/bill';

export const calculateTotals = (
  items: BillItem[],
  serviceCharge: number = 10,
  vat: number = 7
) => {
  const memberTotals: Record<string, number> = {};

  items.forEach((item) => {
    if (item.consumedBy.length === 0) return;
    const pricePerPerson = item.price / item.consumedBy.length;

    item.consumedBy.forEach((memberId) => {
      if (!memberTotals[memberId]) memberTotals[memberId] = 0;
      memberTotals[memberId] += pricePerPerson;
    });
  });

  return Object.entries(memberTotals).map(([id, subtotal]) => {
    const withSC = subtotal * (1 + serviceCharge / 100);
    const withVAT = withSC * (1 + vat / 100);
    return {
      id,
      total: Math.round(withVAT * 100) / 100,
    };
  });
};