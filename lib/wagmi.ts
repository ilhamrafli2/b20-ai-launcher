import { http, createConfig } from 'wagmi';
import { base } from 'wagmi/chains';
import { coinbaseWallet, injected } from 'wagmi/connectors';

export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    injected({ shimDisconnect: true }),
    coinbaseWallet({ appName: 'B20 AI Launcher' }),
  ],
  transports: { [base.id]: http() },
  ssr: true,
});