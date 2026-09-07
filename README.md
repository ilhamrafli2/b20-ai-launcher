# B20 AI Launcher

Prompt-to-B20 launcher for Base.

## Current MVP
- Base wallet connection via injected wallet
- Natural-language prompt with 1–100 token count parsing
- Deterministic random names/tickers/about text
- Unique local SVG token images (no image API cost)
- Official Base B20 Asset factory precompile integration
- Admin is the connected wallet
- Sequential deployment with visible progress

## Example
`Buatkan 100 token di Base dengan nama random, ticker random, image random, about random`

## Run
```bash
npm install
npm run dev
```

## Important
The MVP deliberately does not request seed phrases/private keys and does not silently sign transactions. Wallet security remains with the user's wallet. The next production layer can add Base account abstraction/paymaster/session authorization for one-time approval + sponsored gas, subject to the selected provider and limits.

B20 factory: `0xB20f000000000000000000000000000000000000`.
