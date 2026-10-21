import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  ScrollView,
  View,
} from 'react-native';

import {
  getPublicHouseDetails,
  type PublicHouseDetails,
} from '@/features/houses/services/get-public-house-details';
import {
  confirmHouseAvailability,
  type ConfirmationStatus,
} from '@/features/houses/services/confirm-house-availability';
import {
  reportHouseListing,
  type ReportReason,
} from '@/features/houses/services/report-house-listing';
import {
  getPremiumHouseCandy,
  type PremiumHouseCandy,
} from '@/features/candy-finder-plus/services/candy-finder-plus';

type PublicHouseDetailCardProps = {
  houseId: string;
  isCandyFinderPlusActive: boolean;
  isOwner: boolean;
  onCandyFinderPlus: () => void;
  onEdit: () => void;
  onSignIn: () => void;
  onClose: () => void;
  userId: string | null;
};

const CONFIRMATION_OPTIONS: { label: string; status: ConfirmationStatus }[] = [
  { label: 'Available', status: 'available' },
  { label: 'Running low', status: 'running_low' },
  { label: 'Out', status: 'out' },
];

const REPORT_OPTIONS: { label: string; reason: ReportReason }[] = [
  { label: 'Not participating', reason: 'not_participating' },
  { label: 'Incorrect location', reason: 'incorrect_location' },
  { label: 'Unsafe or inappropriate', reason: 'unsafe_or_inappropriate' },
  { label: 'Other', reason: 'other' },
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
  isCandyFinderPlusActive,
  isOwner,
  onCandyFinderPlus,
  onClose,
  onEdit,
  onSignIn,
  userId,
}: PublicHouseDetailCardProps) {
  const [house, setHouse] = useState<PublicHouseDetails | null>(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [reportDetails, setReportDetails] = useState('');
  const [selectedReportReason, setSelectedReportReason] = useState<ReportReason>('not_participating');
  const [premiumCandy, setPremiumCandy] = useState<PremiumHouseCandy[]>([]);

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

  useEffect(() => {
    if (!isCandyFinderPlusActive || isOwner) {
      return;
    }

    let isCurrent = true;

    const loadPremiumCandy = async () => {
      try {
        const candy = await getPremiumHouseCandy(houseId);

        if (isCurrent) {
          setPremiumCandy(candy);
        }
      } catch {
        if (isCurrent) {
          setPremiumCandy([]);
        }
      }
    };

    void loadPremiumCandy();

    return () => {
      isCurrent = false;
    };
  }, [houseId, isCandyFinderPlusActive, isOwner]);

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

  const submitReport = async () => {
    if (!userId) {
      onSignIn();
      return;
    }

    setIsReporting(true);

    try {
      await reportHouseListing(houseId, userId, selectedReportReason, reportDetails);
      setMessage('Thanks. Your report is queued for review.');
      setReportDetails('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'We could not save your report. Please try again.');
    } finally {
      setIsReporting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      accessibilityViewIsModal
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardAvoidingView}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
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
      {house && !isOwner && isCandyFinderPlusActive ? (
        <View style={styles.premiumCandySection}>
          <Text style={styles.premiumCandyHeading}>Candy Finder+ details</Text>
          {premiumCandy.length > 0 ? (
            <Text style={styles.premiumCandyText}>
              {premiumCandy.map((candy) => `${candy.name} (${candy.size.replace('_', ' ')})`).join(' • ')}
            </Text>
          ) : (
            <Text style={styles.premiumCandyText}>No candy details have been shared for this house yet.</Text>
          )}
        </View>
      ) : null}
      {house && !isOwner && !isCandyFinderPlusActive ? (
        <Pressable
          accessibilityLabel="Learn about Candy Finder Plus"
          accessibilityRole="button"
          onPress={onCandyFinderPlus}
          style={({ pressed }) => [styles.candyFinderButton, pressed ? styles.editButtonPressed : null]}
        >
          <Text style={styles.candyFinderButtonText}>Candy Finder+ shows exact treats</Text>
        </Pressable>
      ) : null}
      {house && isOwner ? (
        <Pressable
          accessibilityLabel="Edit my house listing"
          accessibilityRole="button"
          onPress={onEdit}
          style={({ pressed }) => [styles.editButton, pressed ? styles.editButtonPressed : null]}
        >
          <Text style={styles.editButtonText}>Edit my listing</Text>
        </Pressable>
      ) : null}
      {house && !isOwner ? (
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
      {house && !isOwner ? (
        <View style={styles.reportSection}>
          <Text style={styles.reportHeading}>See an issue?</Text>
          <View style={styles.reportOptions}>
            {REPORT_OPTIONS.map((option) => {
              const isSelected = selectedReportReason === option.reason;

              return (
                <Pressable
                  accessibilityLabel={`Report: ${option.label}`}
                  accessibilityRole="button"
                  disabled={isReporting}
                  key={option.reason}
                  onPress={() => setSelectedReportReason(option.reason)}
                  style={[styles.reportOption, isSelected ? styles.reportOptionSelected : null]}
                >
                  <Text style={[styles.reportOptionText, isSelected ? styles.reportOptionTextSelected : null]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.reportInputHeader}>
            <Text style={styles.reportInputLabel}>Optional details</Text>
          </View>
          <TextInput
            accessibilityLabel="Optional report details"
            editable={!isReporting}
            maxLength={500}
            multiline
            onChangeText={setReportDetails}
            blurOnSubmit
            onSubmitEditing={Keyboard.dismiss}
            placeholder="What happened?"
            placeholderTextColor="#BEB1CD"
            style={styles.reportInput}
            value={reportDetails}
          />
          <Pressable
            accessibilityLabel="Submit listing report"
            accessibilityRole="button"
            disabled={isReporting}
            onPress={() => void submitReport()}
            style={({ pressed }) => [
              styles.reportButton,
              pressed && !isReporting ? styles.reportButtonPressed : null,
              isReporting ? styles.reportButtonDisabled : null,
            ]}
          >
            {isReporting ? <ActivityIndicator color="#F8F4FC" /> : null}
            <Text style={styles.reportButtonText}>{isReporting ? 'Sending report…' : 'Report listing'}</Text>
          </Pressable>
        </View>
      ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    alignSelf: 'stretch',
    flexShrink: 1,
    marginTop: 'auto',
  },
  scrollContent: {
    paddingTop: 8,
  },
  card: {
    alignSelf: 'stretch',
    backgroundColor: 'rgba(24, 15, 36, 0.98)',
    borderColor: 'rgba(155, 97, 201, 0.62)',
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    marginHorizontal: 16,
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
  premiumCandySection: {
    backgroundColor: 'rgba(99, 59, 145, 0.36)',
    borderColor: 'rgba(217, 184, 255, 0.56)',
    borderRadius: 12,
    borderWidth: 1,
    gap: 5,
    padding: 12,
  },
  premiumCandyHeading: {
    color: '#E9D3FF',
    fontSize: 13,
    fontWeight: '700',
  },
  premiumCandyText: {
    color: '#F8F4FC',
    fontSize: 13,
    lineHeight: 19,
  },
  candyFinderButton: {
    alignItems: 'center',
    borderColor: '#8E5DCC',
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: 10,
  },
  candyFinderButtonText: {
    color: '#E9D3FF',
    fontSize: 13,
    fontWeight: '700',
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
  editButton: {
    alignItems: 'center',
    backgroundColor: '#FF9E3D',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 46,
  },
  editButtonPressed: {
    backgroundColor: '#E78328',
  },
  editButtonText: {
    color: '#15101F',
    fontSize: 15,
    fontWeight: '700',
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
  reportSection: {
    borderColor: 'rgba(202, 172, 230, 0.3)',
    borderTopWidth: 1,
    gap: 8,
    paddingTop: 12,
  },
  reportHeading: {
    color: '#F8F4FC',
    fontSize: 14,
    fontWeight: '700',
  },
  reportOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  reportOption: {
    backgroundColor: '#342345',
    borderColor: 'rgba(202, 172, 230, 0.38)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  reportOptionSelected: {
    backgroundColor: 'rgba(255, 158, 61, 0.18)',
    borderColor: '#FFAA4D',
  },
  reportOptionText: {
    color: '#E9DDF5',
    fontSize: 12,
    fontWeight: '600',
  },
  reportOptionTextSelected: {
    color: '#FFAA4D',
  },
  reportInput: {
    backgroundColor: '#342345',
    borderColor: 'rgba(202, 172, 230, 0.38)',
    borderRadius: 10,
    borderWidth: 1,
    color: '#F8F4FC',
    fontSize: 14,
    minHeight: 72,
    padding: 10,
    textAlignVertical: 'top',
  },
  reportInputHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reportInputLabel: {
    color: '#D6CAE2',
    fontSize: 12,
  },
  reportButton: {
    alignItems: 'center',
    borderColor: '#D9B8FF',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 42,
  },
  reportButtonPressed: {
    backgroundColor: 'rgba(217, 184, 255, 0.16)',
  },
  reportButtonDisabled: {
    opacity: 0.7,
  },
  reportButtonText: {
    color: '#F8F4FC',
    fontSize: 13,
    fontWeight: '700',
  },
});
