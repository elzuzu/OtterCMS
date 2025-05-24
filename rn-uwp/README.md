# Indi-Suivi UWP - Application de Gestion d'Individus

Application React Native Windows (UWP) moderne pour la gestion et le suivi d'individus avec interface inspirée de Xbox/Fluent Design.

## 🎯 Vue d'ensemble

Indi-Suivi UWP est une refonte complète de l'application Electron originale, migrée vers React Native Windows pour offrir une expérience native sur Windows 10/11 avec une interface moderne inspirée du design Xbox.

### ✨ Nouveautés v2.0

- **Interface Xbox/Fluent Design** : Design sombre moderne avec effets glassmorphism
- **Performance native** : Application UWP compilée pour Windows
- **Animations fluides** : Transitions et interactions inspirées de l'interface Xbox
- **Navigation latérale** : Sidebar moderne avec icônes et états visuels
- **Cartes interactives** : Tuiles style Xbox avec gradients et effets de survol
- **Mode sombre** : Interface optimisée pour une utilisation prolongée
- **Responsive** : Adaptation automatique à toutes les tailles d'écran

## 🛠️ Technologies

- **React Native 0.73** : Framework principal
- **React Native Windows** : Support natif Windows/UWP
- **TypeScript** : Typage statique
- **SQLite** : Base de données locale
- **Zustand** : Gestion d'état
- **React Navigation** : Navigation

## 📋 Prérequis

- Windows 10 version 1903+ ou Windows 11
- Visual Studio 2022 avec :
  - Développement UWP
  - Développement C++
  - Windows 10 SDK (10.0.19041.0+)
- Node.js 18.x ou supérieur
- npm ou yarn

## 🚀 Installation

1. **Cloner le repository**
   ```bash
   git clone https://github.com/votre-repo/indi-suivi-uwp.git
   cd indi-suivi-uwp/rn-uwp
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   # ou
   yarn install
   ```

3. **Initialiser React Native Windows**
   ```bash
   npx react-native-windows-init --overwrite
   ```

## 🏗️ Compilation

### Mode développement

```bash
# Démarrer Metro bundler
npm start

# Dans un autre terminal, lancer l'app
npm run windows
```

### Mode production

1. **Build Release**
   ```bash
   cd windows
   msbuild /p:Configuration=Release /p:Platform=x64
   ```

2. **Créer le package MSIX**
   ```bash
   msbuild /p:Configuration=Release /p:Platform=x64 /p:AppxBundle=Always /p:AppxBundlePlatforms=x64
   ```

3. **Localisation du package**
   Le package sera dans : `windows\AppPackages\IndiSuiviUWP\`

### Signature du package

Pour distribuer l'application :

1. Créer un certificat de test (développement) :
   ```powershell
   New-SelfSignedCertificate -Type Custom -Subject "CN=IndiSuivi, O=VotreOrganisation, C=FR" -KeyUsage DigitalSignature -FriendlyName "IndiSuivi Cert" -CertStoreLocation "Cert:\CurrentUser\My" -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.3", "2.5.29.19={text}")
   ```

2. Exporter le certificat et l'ajouter au projet

3. Configurer la signature dans Visual Studio

## 📦 Distribution

### Microsoft Store
1. Créer un compte développeur Microsoft
2. Réserver le nom de l'application
3. Soumettre le package via Partner Center

### Sideloading (entreprise)
1. Activer le mode développeur sur les machines cibles
2. Installer le certificat dans "Personnes autorisées"
3. Installer le package MSIX

### Installation via PowerShell
```powershell
Add-AppxPackage -Path "./IndiSuiviUWP_2.0.0.0_x64.msix"
```

## 🎨 Personnalisation

### Thème
Modifier les couleurs dans `src/styles/colors.ts` :
```typescript
export const colors = {
  primary: '#107c10',      // Vert Xbox
  accent: '#2563eb',       // Bleu accent
  background: '#0a0b0d',   // Fond sombre
  // ...
};
```

### Logo et icônes
Remplacer les fichiers dans `windows/IndiSuiviUWP/Assets/` :
- Square150x150Logo.png
- Square44x44Logo.png
- StoreLogo.png
- SplashScreen.png

## 🔧 Configuration

### Base de données
La base SQLite est stockée dans :
```
%LOCALAPPDATA%\Packages\IndiSuiviUWP_[ID]\LocalState\
```

### Permissions requises
Déclarées dans `Package.appxmanifest` :
- `internetClient` : Pour futures synchro
- `documentsLibrary` : Import/export fichiers
- `removableStorage` : Support USB

## 🐛 Débogage

### Logs
```bash
# Voir les logs Metro
npx react-native log-windows

# Logs Visual Studio
Debug > Windows > Output
```

### DevTools
- Shake gesture ou Ctrl+D pour ouvrir le menu développeur
- Remote JS Debugging disponible

## 📱 Captures d'écran

L'interface reprend le design moderne de Xbox avec :
- Navigation latérale sombre
- Cartes avec effets glassmorphism
- Animations fluides
- Typographie moderne
- Effets de survol interactifs

## 🤝 Contribution

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit (`git commit -m 'Add AmazingFeature'`)
4. Push (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 Licence

MIT - voir le fichier [LICENSE](LICENSE)

## 👥 Support

- Documentation : [wiki/docs](https://github.com/votre-repo/wiki)
- Issues : [GitHub Issues](https://github.com/votre-repo/issues)
- Email : support@indi-suivi.com

## 🔄 Migration depuis Electron

Pour migrer vos données depuis l'ancienne version Electron :

1. Exporter la base depuis Electron (format SQLite)
2. Copier le fichier dans le dossier LocalState de l'app UWP
3. L'application détectera et migrera automatiquement les données

---
Développé avec ❤️ pour Windows
