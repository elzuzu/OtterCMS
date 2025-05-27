# Rapport d'audit CSS

Ce rapport résume l'analyse des trois fichiers CSS existants avant la migration vers le template Datta Able.

## Fichiers analysés

- `app.css` (~4800 lignes)
- `colors.css` (~330 lignes)
- `neo-ui.css` (~900 lignes)

## Constats principaux

1. **Redondance élevée** : plusieurs styles génériques (boutons, formulaires, tableaux) sont dupliqués ou peuvent être remplacés par les composants Datta Able.
2. **Systèmes de design multiples** : présence de variables `neo-ui` et d'un design personnalisé qui se chevauchent.
3. **Variables de couleur** : beaucoup de variables inutilisées ou redondantes. Les variables critiques ont été extraites dans `themes.css`.
4. **Styles spécifiques métier** : sections `wizard`, `mass-attribution`, `audit-timeline` et `data-table` contiennent des règles indispensables.
5. **Classes orphelines** : plusieurs règles ne sont plus utilisées dans le code React (ex. anciens panels, anciens composants bootstrap). Elles ont été supprimées lors du nettoyage.

## Recommandations

- Utiliser `themes.css` pour centraliser toutes les couleurs et faciliter la personnalisation.
- Conserver dans `critical.css` uniquement les styles métiers non couverts par Datta Able.
- Remplacer progressivement les composants génériques par leurs équivalents Datta Able.
- Mettre en place un suivi des classes réellement utilisées (ex. avec un outil de purge CSS) pour éviter les futurs surplus.
- Prévoir une seconde phase de test visuel après intégration de Datta Able pour ajuster les derniers écarts.
