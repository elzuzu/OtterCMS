# Migration Datta Able

Cette migration partielle met à jour plusieurs composants pour s'aligner sur le thème Datta Able.

## Fichiers modifiés

- src/renderer/components/AdminUsers.jsx
- src/renderer/components/AdminRoles.jsx
- src/renderer/components/AdminCategories.jsx
- src/renderer/components/UserSettings.jsx
- src/renderer/components/NouvelIndividu.jsx
- src/renderer/components/MassAttribution.jsx
- src/renderer/components/ImportData.jsx
- src/renderer/components/layout/PageWrapper.jsx

## Composants ajoutés

- DattaStepper.jsx
- DattaTabs.jsx

Les anciennes classes custom sont progressivement remplacées par les classes `.card`, `.btn`, `.mb-3`... Les imports MUI inutiles ont été retirés ou enveloppés via de nouveaux wrappers.
