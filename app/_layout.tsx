import { ContractFlowProvider } from '@/hooks/ContractFlowContext';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <ContractFlowProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: '#F4F7FF',
          },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="result" />
      </Stack>
    </ContractFlowProvider>
  );
}
