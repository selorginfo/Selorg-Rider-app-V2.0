import React, {useCallback, useState} from 'react';
import {ActivityIndicator, View, StyleSheet} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {LegalScreen} from './LegalScreen';
import {configApi} from '../../services/api';
import type {LegalSection} from '../../types';
import {colors} from '../../theme';

export function TermsScreen() {
  const [sections, setSections] = useState<LegalSection[]>([]);
  const [dateLine, setDateLine] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const result = await configApi.getTerms();
    if (result.ok && result.data?.sections?.length) {
      setSections(result.data.sections);
      setDateLine(
        result.data.effectiveDateDisplay ??
          (result.data.effectiveDate
            ? `Effective ${result.data.effectiveDate}`
            : ''),
      );
    } else {
      setSections([]);
      setError(result.error || 'Could not load terms.');
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
      title="Terms of Service"
      dateLine={dateLine}
      sections={
        sections.length > 0
          ? sections
          : [{h: 'Unavailable', b: error || 'Terms could not be loaded. Please retry.'}]
      }
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
