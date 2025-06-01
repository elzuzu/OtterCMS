# Architecture des thèmes

L'interface utilise le moteur de styles du template **Datta Able** combiné à Material-UI. Les couleurs et polices principales sont définies dans `src/renderer/styles/themes.css` et appliquées via la fonction React `useTheme`.

## Fonctionnement

- `useTheme` définit désormais l'attribut `data-pc-preset` sur la balise `<html>` pour activer les préréglages de couleur Datta Able et charge la couleur principale correspondante.
- Les couleurs de base sont stockées dans `colors.css` et surchargées par `themes.css`.
- Les composants wrappers (`DattaCard`, `DattaDataTable`, etc.) encapsulent ceux de MUI pour conserver une apparence uniforme.

Vous pouvez ajouter d'autres thèmes en ajoutant de nouveaux presets dans `useTheme.js` et en étendant la liste proposée dans la rubrique Template.

## Rubrique Template

La page **Template** s'appuie maintenant sur la palette de couleurs de Datta Able. Celle-ci reprend les couleurs Bootstrap principales (Primary, Secondary, Success, Danger, Warning, Info, Light et Dark) regroupées dans la carte Sass `$theme-colors`. Grâce à ce mécanisme, les classes utilitaires `.text-{color}` et `.bg-{color}` sont générées automatiquement pour personnaliser rapidement l'interface.

Cette même page permet toujours de configurer la bordure externe de la fenêtre Windows. Les couleurs choisies et l'épaisseur sont sauvegardées dans `localStorage` puis appliquées via les variables CSS `--window-border-color` et `--window-border-width` définies dans `themes.css`. À défaut de personnalisation, les valeurs lues dans `config/app-config.json` (clé `windowBorder`) sont utilisées.

### Changer la couleur de bordure depuis la console

La fonction native `setWindowBorderColor` se situe dans le **processus principal** d'Electron. Pour modifier la bordure depuis l'interface, utilisez l'API IPC exposée par le preload :

```javascript
// Console du renderer (DevTools)
window.api.applyBorderTemplate({ color: '#ff0000' });
```

Vous pouvez également instancier `BorderTemplateService` pour bénéficier des validations et de l'historique :

```javascript
const borderService = new BorderTemplateService();
borderService.applyTemplate({ color: '#00ff00' });
```

Un exemple de test automatique est disponible dans `src/main.js` via la fonction `testBorderColors()`.
