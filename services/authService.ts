import { MOCK_USER } from '@/constants/mocks';
import { AppUser } from '@/types/contract';

export const authService = {
  async getCurrentUser(): Promise<AppUser | null> {
    await delay(250);

    // TODO: integrar autenticação real (Firebase Auth)
    return MOCK_USER;
  },

  async signOut(): Promise<void> {
    await delay(200);

    // TODO: encerrar sessão real no provedor de autenticação
  },
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
