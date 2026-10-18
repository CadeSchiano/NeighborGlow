import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { HouseAvailabilityStatus } from '@/features/houses/services/get-own-house-listing';
import { updateHouseAvailability } from '@/features/houses/services/update-house-availability';

const STATUS_OPTIONS: {
  description: string;
  label: string;
  status: HouseAvailabilityStatus;
}[] = [
  { status: 'available', label: 'Available', description: 'Public pin is visible.' },
  { status: 'running_low', label: 'Running low', description: 'Public pin is visible.' },
  { status: 'out', label: 'Out', description: 'Public pin is hidden.' },
  { status: 'finished', label: 'Finished', description: 'Public pin is hidden.' },
];

type HouseAvailabilityControlProps = {
  houseId: string;
  initialStatus: HouseAvailabilityStatus;
  ownerId: string;
};

export function HouseAvailabilityControl({
  houseId,
  initialStatus,
  ownerId,
}: HouseAvailabilityControlProps) {
  const [status, setStatus] = useState(initialStatus);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState(
    initialStatus === 'available' || initialStatus === 'running_low'
      ? 'Your house is visible to nearby map viewers.'
      : 'Your house is not visible on the public map.'
  );

  const setAvailability = async (nextStatus: HouseAvailabilityStatus) => {
    if (nextStatus === status || isSaving) {
      return;
    }

    setIsSaving(true);
    setMessage('');

    try {
      await updateHouseAvailability({ houseId, ownerId, status: nextStatus });
      setStatus(nextStatus);
      setMessage(
        nextStatus === 'available' || nextStatus === 'running_low'
          ? 'Saved. Your house is visible to nearby map viewers.'
          : 'Saved. Your house is hidden from the public map.'
      );
    } catch {
      setMessage('We could not update availability. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>LIVE HALLOWEEN STATUS</Text>
      <Text style={styles.heading}>Candy availability</Text>
      <Text style={styles.description}>{message}</Text>
      <View style={styles.options}>
        {STATUS_OPTIONS.map((option) => {
          const isSelected = option.status === status;

          return (
            <Pressable
              accessibilityHint={option.description}
              accessibilityLabel={`Set availability to ${option.label}`}
              accessibilityRole="button"
              disabled={isSaving}
              key={option.status}
              onPress={() => void setAvailability(option.status)}
              style={({ pressed }) => [
                styles.option,
                isSelected ? styles.optionSelected : null,
                pressed && !isSaving ? styles.optionPressed : null,
                isSaving ? styles.optionDisabled : null,
              ]}
            >
              <Text style={[styles.optionLabel, isSelected ? styles.optionLabelSelected : null]}>
                {option.label}
              </Text>
              <Text style={[styles.optionDescription, isSelected ? styles.optionDescriptionSelected : null]}>
                {option.description}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {isSaving ? <ActivityIndicator color="#FFAA4D" /> : null}
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
  options: {
    gap: 8,
    marginTop: 4,
  },
  option: {
    backgroundColor: '#342345',
    borderColor: 'rgba(202, 172, 230, 0.38)',
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 62,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  optionSelected: {
    backgroundColor: 'rgba(255, 158, 61, 0.18)',
    borderColor: '#FFAA4D',
  },
  optionPressed: {
    opacity: 0.78,
  },
  optionDisabled: {
    opacity: 0.65,
  },
  optionLabel: {
    color: '#F8F4FC',
    fontSize: 16,
    fontWeight: '700',
  },
  optionLabelSelected: {
    color: '#FFAA4D',
  },
  optionDescription: {
    color: '#D6CAE2',
    fontSize: 13,
    marginTop: 2,
  },
  optionDescriptionSelected: {
    color: '#F8E5CB',
  },
});
