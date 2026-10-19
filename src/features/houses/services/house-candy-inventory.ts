import { supabase } from '@/services/supabase/client';

export type Candy = {
  id: number;
  name: string;
};

export type CandySize = 'full_size' | 'fun_size' | 'mixed';

export type HouseCandy = {
  candy_id: number;
  size: CandySize;
};

export async function getCandyCatalog(): Promise<Candy[]> {
  const { data, error } = await supabase.from('candies').select('id, name').order('name');

  if (error) {
    throw error;
  }

  return (data ?? []) as Candy[];
}

export async function getHouseCandyInventory(houseId: string): Promise<HouseCandy[]> {
  const { data, error } = await supabase
    .from('house_candy')
    .select('candy_id, size')
    .eq('house_id', houseId);

  if (error) {
    throw error;
  }

  return (data ?? []) as HouseCandy[];
}

export async function saveHouseCandyInventory(houseId: string, inventory: HouseCandy[]) {
  const { error } = await supabase.rpc('replace_my_house_candy', {
    p_candy_ids: inventory.map(({ candy_id }) => candy_id),
    p_candy_sizes: inventory.map(({ size }) => size),
    p_house_id: houseId,
  });

  if (error) {
    throw error;
  }
}
