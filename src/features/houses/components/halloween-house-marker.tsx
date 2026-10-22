import { StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';

import type { VisibleHouse } from '@/features/houses/services/get-houses-in-bounds';

type HalloweenHouseMarkerProps = {
  house: VisibleHouse;
  onPress: () => void;
};

function getMarkerStyle(house: VisibleHouse) {
  if (house.haunted) {
    return { accent: '#B978FF', badge: '👻', label: 'Haunted house' };
  }

  if (house.decorated) {
    return { accent: '#FF8A36', badge: '🎃', label: 'Decorated house' };
  }

  if (house.allergy_friendly) {
    return { accent: '#48D6BE', badge: '🍬', label: 'Allergy-friendly treats' };
  }

  if (house.non_candy) {
    return { accent: '#62A7FF', badge: '✨', label: 'Non-candy treats' };
  }

  return { accent: house.status === 'running_low' ? '#FFB347' : '#FF9E3D', badge: '🎃', label: 'Trick-or-treat house' };
}

export function HalloweenHouseMarker({ house, onPress }: HalloweenHouseMarkerProps) {
  const marker = getMarkerStyle(house);
  const accessibilityLabel = `${marker.label}. ${house.status === 'running_low' ? 'Candy running low.' : 'Candy available.'}${house.accessible ? ' Accessible.' : ''}`;

  return (
    <Marker
      accessibilityLabel={accessibilityLabel}
      coordinate={{ latitude: house.latitude, longitude: house.longitude }}
      onPress={onPress}
      tracksViewChanges={false}
    >
      <View style={styles.marker}>
        <View style={[styles.markerFace, { borderColor: marker.accent }]}> 
          <Text style={styles.markerEmoji}>{marker.badge}</Text>
          {house.accessible ? <Text style={styles.accessibleBadge}>♿</Text> : null}
        </View>
        <View style={[styles.markerPoint, { borderTopColor: marker.accent }]} />
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  marker: { alignItems: 'center', height: 52, width: 52 },
  markerFace: {
    alignItems: 'center',
    backgroundColor: '#251535',
    borderRadius: 19,
    borderWidth: 3,
    height: 40,
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    width: 40,
  },
  markerEmoji: { fontSize: 21 },
  markerPoint: { borderLeftColor: 'transparent', borderLeftWidth: 7, borderRightColor: 'transparent', borderRightWidth: 7, borderTopWidth: 11, marginTop: -2 },
  accessibleBadge: { backgroundColor: '#F8F4FC', borderRadius: 8, color: '#352147', fontSize: 10, overflow: 'hidden', paddingHorizontal: 2, position: 'absolute', right: -5, top: -5 },
});
