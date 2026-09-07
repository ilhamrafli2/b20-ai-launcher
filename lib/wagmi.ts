import { http, createConfig } from 'wagmi';
import { base } from 'wagmi/chains';
import { coinbaseWallet, injected } from 'wagmi/connectors';

export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    // Put Coinbase Wallet first so mobile Safari can hand off to the wallet app
    // instead of selecting an unavailable browser-injected provider.
    coinbaseWallet({ appName: 'B20 AI Launcher' }),
    injected({ shimDisconnect: true }),
  ],
  transports: { [base.id]: http() },
  ssr: true,
});
