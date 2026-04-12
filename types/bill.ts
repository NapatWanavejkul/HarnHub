// types/bill.ts
export type SplitMode = 'EQUAL' | 'ITEMIZED' | 'HYBRID';

export interface Participant {
  id: string;
  name: string;
  promptPayId?: string; 
}

export interface BillItem {
  id: string;
  name: string;
  price: number;
  consumedBy: string[]; // Array of Participant IDs
}

export interface Bill {
  id: string;
  hostId: string;
  restaurantName: string;
  items: BillItem[];
  participants: Participant[];
  serviceChargePercent: number; 
  vatPercent: number; 
  splitMode: SplitMode;
  createdAt: Date;
}