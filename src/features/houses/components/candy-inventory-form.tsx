import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  getCandyCatalog,
  getHouseCandyInventory,
  saveHouseCandyInventory,
  type Candy,
  type CandySize,
} from '@/features/houses/services/house-candy-inventory';

const SIZE_OPTIONS: { label: string; value: CandySize }[] = [
  { label: 'Fun size', value: 'fun_size' },
  { label: 'Full size', value: 'full_size' },
  { label: 'Mixed', value: 'mixed' },
];

type CandyInventoryFormProps = {
  houseId: string;
};

export function CandyInventoryForm({ houseId }: CandyInventoryFormProps) {
  const [catalog, setCatalog] = useState<Candy[]>([]);
  const [inventory, setInventory] = useState<Record<number, CandySize>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('Choose the treats you expect to give out.');

  useEffect(() => {
    let isCurrent = true;

    const loadInventory = async () => {
      try {
        const [candyCatalog, houseCandy] = await Promise.all([
          getCandyCatalog(),
          getHouseCandyInventory(houseId),
        ]);

        if (isCurrent) {
          setCatalog(candyCatalog);
          setInventory(
            Object.fromEntries(houseCandy.map(({ candy_id, size }) => [candy_id, size])) as Record<
              number,
              CandySize
            >
          );
        }
      } catch {
        if (isCurrent) {
          setMessage('We could not load candy choices. Please try again.');
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    };

    void loadInventory();

    return () => {
      isCurrent = false;
    };
  }, [houseId]);

  const selectedCandies = useMemo(
    () => catalog.filter((candy) => inventory[candy.id]),
    [catalog, inventory]
  );

  const toggleCandy = (candyId: number) => {
    setInventory((currentInventory) => {
      const nextInventory = { ...currentInventory };

      if (nextInventory[candyId]) {
        delete nextInventory[candyId];
      } else {
        nextInventory[candyId] = 'mixed';
      }

      return nextInventory;
    });
  };

  const updateCandySize = (candyId: number, size: CandySize) => {
    setInventory((currentInventory) => ({ ...currentInventory, [candyId]: size }));
  };

  const saveInventory = async () => {
    setIsSaving(true);
    setMessage('');

    try {
      await saveHouseCandyInventory(
        houseId,
        Object.entries(inventory).map(([candyId, size]) => ({
          candy_id: Number(candyId),
          size,
        }))
      );
      setMessage('Candy inventory saved. You can update it any time.');
    } catch {
      setMessage('We could not save your candy inventory. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>STEP 3 · TREATS</Text>
      <Text style={styles.heading}>Candy inventory</Text>
      <Text style={styles.description}>{message}</Text>
      {isLoading ? <ActivityIndicator color="#FFAA4D" style={styles.loader} /> : null}
      {!isLoading ? (
        <View style={styles.chips}>
          {catalog.map((candy) => {
            const isSelected = Boolean(inventory[candy.id]);

            return (
              <Pressable
                accessibilityLabel={`${isSelected ? 'Remove' : 'Add'} ${candy.name}`}
                accessibilityRole="button"
                disabled={isSaving}
                key={candy.id}
                onPress={() => toggleCandy(candy.id)}
                style={({ pressed }) => [
                  styles.candyChip,
                  isSelected ? styles.candyChipSelected : null,
                  pressed && !isSaving ? styles.candyChipPressed : null,
                ]}
              >
                <Text style={[styles.candyChipText, isSelected ? styles.candyChipTextSelected : null]}>
                  {candy.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      {selectedCandies.map((candy) => (
        <View key={candy.id} style={styles.selectedCandy}>
          <Text style={styles.selectedCandyName}>{candy.name}</Text>
          <View style={styles.sizeOptions}>
            {SIZE_OPTIONS.map((option) => {
              const isSelected = inventory[candy.id] === option.value;

              return (
                <Pressable
                  accessibilityLabel={`${candy.name}: ${option.label}`}
                  accessibilityRole="button"
                  disabled={isSaving}
                  key={option.value}
                  onPress={() => updateCandySize(candy.id, option.value)}
                  style={[styles.sizeOption, isSelected ? styles.sizeOptionSelected : null]}
                >
                  <Text style={[styles.sizeOptionText, isSelected ? styles.sizeOptionTextSelected : null]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
      <Pressable
        accessibilityLabel="Save candy inventory"
        accessibilityRole="button"
        disabled={isLoading || isSaving}
        onPress={() => void saveInventory()}
        style={({ pressed }) => [
          styles.saveButton,
          pressed && !isSaving ? styles.saveButtonPressed : null,
          isLoading || isSaving ? styles.saveButtonDisabled : null,
        ]}
      >
        {isSaving ? <ActivityIndicator color="#15101F" /> : null}
        <Text style={[styles.saveButtonText, isSaving ? styles.saveButtonTextLoading : null]}>
          {isSaving ? 'Saving candy…' : 'Save candy inventory'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(24, 15, 36, 0.97)',
    borderColor: 'rgba(155, 97, 201, 0.58)',
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
    marginBottom: 24,
    padding: 18,
  },
  eyebrow: {
    color: '#FFAA4D',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  heading: {
    color: '#F8F4FC',
    fontSize: 22,
    fontWeight: '700',
  },
  description: {
    color: '#E9DDF5',
    fontSize: 14,
    lineHeight: 20,
  },
  loader: {
    marginVertical: 12,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  candyChip: {
    backgroundColor: '#342345',
    borderColor: 'rgba(202, 172, 230, 0.38)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  candyChipSelected: {
    backgroundColor: 'rgba(255, 158, 61, 0.18)',
    borderColor: '#FFAA4D',
  },
  candyChipPressed: {
    opacity: 0.78,
  },
  candyChipText: {
    color: '#E9DDF5',
    fontSize: 13,
    fontWeight: '600',
  },
  candyChipTextSelected: {
    color: '#FFAA4D',
  },
  selectedCandy: {
    borderColor: 'rgba(202, 172, 230, 0.3)',
    borderTopWidth: 1,
    gap: 8,
    paddingTop: 10,
  },
  selectedCandyName: {
    color: '#F8F4FC',
    fontSize: 15,
    fontWeight: '700',
  },
  sizeOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  sizeOption: {
    alignItems: 'center',
    backgroundColor: '#342345',
    borderColor: 'rgba(202, 172, 230, 0.38)',
    borderRadius: 9,
    borderWidth: 1,
    flex: 1,
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  sizeOptionSelected: {
    backgroundColor: '#7A45AD',
    borderColor: '#D9B8FF',
  },
  sizeOptionText: {
    color: '#E9DDF5',
    fontSize: 12,
    fontWeight: '700',
  },
  sizeOptionTextSelected: {
    color: '#FFFFFF',
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: '#FF9E3D',
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 52,
    paddingHorizontal: 18,
  },
  saveButtonPressed: {
    backgroundColor: '#E78328',
  },
  saveButtonDisabled: {
    opacity: 0.75,
  },
  saveButtonText: {
    color: '#15101F',
    fontSize: 16,
    fontWeight: '700',
  },
  saveButtonTextLoading: {
    marginLeft: 8,
  },
});
