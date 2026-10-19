import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  getPublicHouseDetails,
  type PublicHouseDetails,
} from '@/features/houses/services/get-public-house-details';
import {
  confirmHouseAvailability,
  type ConfirmationStatus,
} from '@/features/houses/services/confirm-house-availability';

type PublicHouseDetailCardProps = {
  houseId: string;
  onSignIn: () => void;
  onClose: () => void;
  userId: string | null;
};

const CONFIRMATION_OPTIONS: { label: string; status: ConfirmationStatus }[] = [
  { label: 'Available', status: 'available' },
  { label: 'Running low', status: 'running_low' },
  { label: 'Out', status: 'out' },
];

function formatTime(value: string | null) {
  if (!value) {
    return null;
  }

  const [hours, minutes] = value.split(':').map(Number);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return null;
  }

  const time = new Date();
  time.setHours(hours, minutes, 0, 0);
  return time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function getAttributes(house: PublicHouseDetails) {
  return [
    house.decorated ? 'Decorated' : null,
    house.haunted ? 'Haunted' : null,
    house.accessible ? 'Accessible' : null,
    house.allergy_friendly ? 'Allergy-friendly' : null,
    house.non_candy ? 'Non-candy treats' : null,
  ].filter((attribute): attribute is string => Boolean(attribute));
}

export function PublicHouseDetailCard({
  houseId,
  onClose,
  onSignIn,
  userId,
}: PublicHouseDetailCardProps) {
  const [house, setHouse] = useState<PublicHouseDetails | null>(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    const loadHouse = async () => {
      try {
        const details = await getPublicHouseDetails(houseId);

        if (isCurrent) {
          setHouse(details);
          setMessage(details ? '' : 'This house is no longer active.');
        }
      } catch {
        if (isCurrent) {
          setMessage('We could not load this house right now.');
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    };

    void loadHouse();

    return () => {
      isCurrent = false;
    };
  }, [houseId]);

  const hours = house?.starts_at && house.ends_at ? `${formatTime(house.starts_at)} – ${formatTime(house.ends_at)}` : null;
  const attributes = house ? getAttributes(house) : [];

  const submitConfirmation = async (status: ConfirmationStatus) => {
    if (!userId) {
      onSignIn();
      return;
    }

    setIsConfirming(true);

    try {
      await confirmHouseAvailability(houseId, userId, status);
      setMessage('Thanks for helping neighbors keep this listing current.');
    } catch {
      setMessage('We could not save your confirmation. Please try again.');
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <View accessibilityViewIsModal style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>TRICK-OR-TREAT STOP</Text>
          <Text style={styles.title}>{house?.status === 'running_low' ? 'Candy running low' : 'Candy available'}</Text>
        </View>
        <Pressable
          accessibilityLabel="Close house details"
          accessibilityRole="button"
          onPress={onClose}
          style={({ pressed }) => [styles.closeButton, pressed ? styles.closeButtonPressed : null]}
        >
          <Text style={styles.closeButtonText}>×</Text>
        </Pressable>
      </View>
      {isLoading ? <ActivityIndicator color="#FFAA4D" style={styles.loader} /> : null}
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {hours ? <Text style={styles.hours}>Halloween hours: {hours}</Text> : null}
      {attributes.length > 0 ? (
        <View style={styles.attributes}>
          {attributes.map((attribute) => (
            <View key={attribute} style={styles.attributeChip}>
              <Text style={styles.attributeText}>{attribute}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {house?.last_confirmed_at ? (
        <Text style={styles.confirmationSummary}>
          Confirmed by {house.recent_confirmation_count} neighbor{house.recent_confirmation_count === 1 ? '' : 's'} recently
        </Text>
      ) : null}
      {house ? <Text style={styles.note}>Availability is homeowner-reported and may change during the night.</Text> : null}
      {house ? (
        <View style={styles.confirmationSection}>
          <Text style={styles.confirmationHeading}>Is this house still giving out candy?</Text>
          <View style={styles.confirmationOptions}>
            {CONFIRMATION_OPTIONS.map((option) => (
              <Pressable
                accessibilityLabel={`Confirm ${option.label}`}
                accessibilityRole="button"
                disabled={isConfirming}
                key={option.status}
                onPress={() => void submitConfirmation(option.status)}
                style={({ pressed }) => [
                  styles.confirmationButton,
                  pressed && !isConfirming ? styles.confirmationButtonPressed : null,
                  isConfirming ? styles.confirmationButtonDisabled : null,
                ]}
              >
                <Text style={styles.confirmationButtonText}>{option.label}</Text>
              </Pressable>
            ))}
          </View>
          {isConfirming ? <ActivityIndicator color="#FFAA4D" /> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    backgroundColor: 'rgba(24, 15, 36, 0.98)',
    borderColor: 'rgba(155, 97, 201, 0.62)',
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    marginHorizontal: 16,
    marginTop: 'auto',
    padding: 18,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: '#FFAA4D',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  title: {
    color: '#62D779',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 4,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: '#342345',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  closeButtonPressed: {
    opacity: 0.72,
  },
  closeButtonText: {
    color: '#F8F4FC',
    fontSize: 25,
    fontWeight: '300',
    lineHeight: 28,
  },
  loader: {
    marginVertical: 8,
  },
  message: {
    color: '#F2EDF8',
    fontSize: 15,
    lineHeight: 21,
  },
  hours: {
    color: '#F8F4FC',
    fontSize: 15,
    fontWeight: '600',
  },
  attributes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  attributeChip: {
    backgroundColor: '#4A3268',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  attributeText: {
    color: '#F3E8FF',
    fontSize: 12,
    fontWeight: '700',
  },
  note: {
    color: '#CDBFDD',
    fontSize: 12,
    lineHeight: 17,
  },
  confirmationSummary: {
    color: '#D9B8FF',
    fontSize: 13,
    fontWeight: '600',
  },
  confirmationSection: {
    borderColor: 'rgba(202, 172, 230, 0.3)',
    borderTopWidth: 1,
    gap: 8,
    paddingTop: 12,
  },
  confirmationHeading: {
    color: '#F8F4FC',
    fontSize: 14,
    fontWeight: '700',
  },
  confirmationOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  confirmationButton: {
    alignItems: 'center',
    backgroundColor: '#FF9E3D',
    borderRadius: 10,
    flex: 1,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 5,
  },
  confirmationButtonPressed: {
    backgroundColor: '#E78328',
  },
  confirmationButtonDisabled: {
    opacity: 0.7,
  },
  confirmationButtonText: {
    color: '#15101F',
    fontSize: 12,
    fontWeight: '700',
  },
});
