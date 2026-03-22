import { ActionButton } from '@/components/ActionButton';
import { AppHeader } from '@/components/AppHeader';
import { ContractFileCard } from '@/components/ContractFileCard';
import { ScreenContainer } from '@/components/ScreenContainer';
import { StateBanner } from '@/components/StateBanner';
import { UploadArea } from '@/components/UploadArea';
import { APP_TEXTS } from '@/constants/texts';
import { colors, radius, spacing, typography } from '@/constants/theme';
import { useContractFlow } from '@/hooks/useContractFlow';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  const router = useRouter();
  const {
    selectedFile,
    isSelectingFile,
    isAnalyzing,
    error,
    selectMockFile,
    clearSelectedFile,
    analyzeSelectedContract,
  } = useContractFlow();

  const handleAnalyze = async () => {
    const success = await analyzeSelectedContract();
    if (success) {
      router.push('/result');
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.hero}>
        <Text style={styles.heroTag}>Contrato + IA</Text>
        <AppHeader title={APP_TEXTS.homeTitle} subtitle={APP_TEXTS.homeDescription} />
      </View>

      <UploadArea onSelectFile={selectMockFile} loading={isSelectingFile} />

      {selectedFile ? (
        <ContractFileCard file={selectedFile} onRemove={clearSelectedFile} />
      ) : (
        <StateBanner message={APP_TEXTS.noFile} />
      )}

      {error ? <StateBanner message={error} tone="error" /> : null}

      <ActionButton
        label={APP_TEXTS.analyzeCta}
        onPress={handleAnalyze}
        loading={isAnalyzing}
        disabled={!selectedFile}
      />
      <ActionButton label="Ver histórico" onPress={() => router.push('/history')} variant="secondary" />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  heroTag: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    color: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    fontWeight: '700',
    fontSize: typography.caption,
  },
});
