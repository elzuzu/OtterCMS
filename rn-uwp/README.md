# React Native UWP (Preview)

This folder contains an evolving setup for migrating **Indi-Suivi** to React Native Windows (UWP).

## Prerequisites

- Node.js >= 20
- Windows 10 SDK
- Visual Studio 2022 with UWP components
- `react-native` and `react-native-windows`

## Getting Started

1. Install packages:
   ```bash
   npm install react-native react-native-windows --save
   ```
2. Generate the Windows solution:
   ```bash
   npx react-native-windows-init --version latest --overwrite
   ```
3. Run the app:
   ```bash
   npx react-native run-windows
   ```

## Project Structure

- `App.tsx` – loads the authentication component and shows a basic home screen.
- `index.js` – entry point registering the React Native app.
- `src/components/Auth.tsx` – React Native version of the login form.
- `src/api.ts` – mocked API used by the demo components.

These files are starting points. Replace the mock API with real logic and progressively port the Electron renderer features.
