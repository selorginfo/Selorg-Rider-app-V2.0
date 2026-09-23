import React, {useCallback, useState} from 'react';
import {ActivityIndicator, View, StyleSheet} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {LegalScreen} from './LegalScreen';
import {configApi} from '../../services/api';
import type {LegalSection} from '../../types';
import {colors} from '../../theme';

export function PrivacyScreen() {
  const [sections, setSections] = useState<LegalSection[]>([]);
  const [dateLine, setDateLine] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await configApi.getPrivacy();
    if (result.ok && result.data?.sections?.length) {
      setSections(result.data.sections);
      setDateLine(
        result.data.lastUpdatedDisplay ??
          result.data.effectiveDateDisplay ??
          (result.data.effectiveDate
            ? `Effective ${result.data.effectiveDate}`
            : ''),
      );
    } else {
      setSections([
        {
          h: 'Unavailable',
          b: result.error || 'Privacy policy could not be loaded. Please retry.',
        },
      ]);
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <LegalScreen
      title="Privacy Policy"
      dateLine={dateLine}
      sections={sections}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
});
