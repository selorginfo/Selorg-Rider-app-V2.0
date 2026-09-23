import React, {useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {BottomSheet} from './BottomSheet';
import {SheetHeading} from './SheetHeading';
import {RadioRow} from '../inputs/RadioRow';
import {AppText} from '../common/AppText';
import {useRider} from '../../store/RiderContext';
import {useAppConfig} from '../../hooks/useAppConfig';
import {colors} from '../../theme';

/** Settings → "Choose language" sheet. Languages come from GET /picker/config. */
export function LanguageSheet() {
  const {state, actions} = useRider();
  const cfg = useAppConfig();
  const languages = cfg.languages;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    if (!state.langOpen) {
      setSaving(false);
      setError('');
      setPendingId(null);
    }
  }, [state.langOpen]);

  const onSelect = async (id: string) => {
    if (saving) {
      return;
    }
    setSaving(true);
    setPendingId(id);
    setError('');
    const result = await actions.setLanguage(id);
    setSaving(false);
    setPendingId(null);
    if (!result.ok) {
      setError(result.error || 'Could not update language. Try again.');
    }
  };

  return (
    <BottomSheet
      visible={state.langOpen}
      onClose={() => {
        if (saving) {
          return;
        }
        actions.closeLang();
      }}>
      <SheetHeading
        title="Choose language"
        subtitle={
          saving
            ? 'Saving your language…'
            : 'App text will switch to your selection'
        }
      />
      {!!error && <AppText style={styles.error}>{error}</AppText>}
      <View style={styles.list}>
        {languages.map(l => (
          <RadioRow
            key={l.id}
            title={l.native}
            subtitle={
              pendingId === l.id && saving
                ? 'Saving…'
                : l.en
            }
            selected={state.language === l.id}
            onPress={() => {
              void onSelect(l.id);
            }}
            titleWeight="700"
          />
        ))}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  list: {gap: 9, marginTop: 16},
  error: {
    fontWeight: '600',
    fontSize: 12,
    color: colors.danger,
    marginTop: 10,
    textAlign: 'center',
  },
});
