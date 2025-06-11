# Exemples de requêtes SQL

Ce document présente des exemples d'extraction de données et les triggers
associés aux tables **RPCCASDEC**, **RPCCASNVX** et **RPCDECPER**. Les noms et
prénoms ont été anonymisés.

## Vue d'ensemble

Les trois tables décrites ici proviennent de la base *RPC* (Prestations
complémentaires). Elles contiennent des informations mensuelles liées aux cas
et aux décisions concernant les prestations sociales versées. Les montants sont
exprimés en francs suisses et l'attribut `MOIS_TRAITE` suit le format `AAAAMM`.

Relations principales :

- `RPCCASDEC` liste les décisions par cas pour chaque mois.
- `RPCDECPER` contient le détail des personnes associées à une décision
  (`ID_CASDECMOIS` fait le lien avec `RPCCASDEC`).
- `RPCCASNVX` enregistre les nouveaux cas transmis.

Les triggers définis dans la base mettent à jour automatiquement la date de
création et génèrent les identifiants via les séquences `numer_rpccasdec` et
`numer_rpccasnvx`.

## Table `RPCCASDEC`

Exemple de requête :

```sql
SELECT * FROM anis.rpccasdec
ORDER BY mois_traite, id_cas DESC;
```

Extrait des résultats :

| ID_CASDECMOIS | ID_CAS | CODE_DECISION | STATUT        | MOIS_TRAITE | NOM_PREN_CHEF |
|--------------:|-------:|--------------:|---------------|------------:|---------------|
| 1513013       | 84506  | 2491294438I84506 | ACQUITTE_TECH | 202311      | Personne A    |
| 1534478       | 688341 | 2646443910I645116 | ACQUITTE_TECH | 202311      | Personne B    |

Les colonnes disponibles dans cette table sont notamment :

- `ID_CASDECMOIS`
- `ID_CAS`
- `ID_DECISION`
- `STATUT`
- `ID_MESSAGE`
- `INFO_ERREUR`
- `MOIS_TRAITE`
- `CODE_DECISION`
- `DATE_DECISION`
- `MOTIF_DECISION`
- `DATE_DEBUT`
- `DATE_FIN`
- `D_TRANS_MTMAX`
- `D_TRANS_REFPC`
- `MT_SS_ASSMAL`
- `MT_AV_ASSMAL`
- `LIMITE_PC`
- `NUM_OFFICE`
- `NUM_AGENCE`
- `AUTRE_FORT`
- `FORT_DESSAISIE`
- `AUTRE_DETTE`
- `FRAN_FORT`
- `FORTUNE_PEC`
- `REVENU_FORT`
- `USUFRUIT`
- `REVENU_F_PEC`
- `GAIN_TOT_PEC`
- `TX_REVE_F_PEC`
- `BESOIN_VITAL`
- `ENFANT`
- `FORT_IMMO`
- `DETTE_HYPOTH`
- `REVENU_FORT_I`
- `INTE_HYPOTH`
- `FRAIS_ENTRE`
- `INTE_H_FRAIS_E`
- `VALE_IMME_HABI`
- `FRAN_IMME_HABI`
- `VALE_LOCATIVE`
- `LOYER_B_PEC`
- `CATE_LOYER`
- `LOYER_B_TOTAL`
- `PART_LOYER_B`
- `LOYER_MAX`
- `TYPE_ANNUL`
- `DATECREA`
- `DATEMSAJ`
- `NUM_DOSSIER`
- `NUM_PERS_CHEF`
- `ID_DECPART`
- `NOM_PREN_CHEF`
- `DETTE_HYPO_IMMO`
- `DETTE_HYPO_HABI`
- `TYPE_DESSAISISSEMENT`
- `REGION_LOYER`
- `SUPP_FAUTEUIL`
- `NB_PERSONNE`
- `SITUATION_VIE`
- `BASCULE_LPC`

### Triggers `RPCCASDEC`

```sql
CREATE OR REPLACE TRIGGER ANIS.trg_del_rpccasdec
BEFORE DELETE ON RPCCASDEC
FOR EACH ROW
BEGIN
  pack_anis.nonexiste('id_casdecmois','rpcdecper',:old.id_casdecmois);
END;
/

CREATE OR REPLACE TRIGGER ANIS.trg_ins_rpccasdec
BEFORE INSERT ON RPCCASDEC
FOR EACH ROW
BEGIN
  IF :new.id_casdecmois IS NULL THEN
    SELECT numer_rpccasdec.nextval INTO :new.id_casdecmois FROM sys.dual;
  END IF;
  :new.datecrea := SYSDATE;
  :new.datemsaj := SYSDATE;
END;
/

CREATE OR REPLACE TRIGGER ANIS.trg_maj_rpccasdec
BEFORE UPDATE ON RPCCASDEC
FOR EACH ROW
BEGIN
  :new.datemsaj := SYSDATE;
  :new.datecrea := :old.datecrea;
END;
/
```

## Table `RPCCASNVX`

Exemple de requête :

```sql
SELECT * FROM anis.RPCCASNVX ORDER BY id DESC;
```

Extrait des résultats :

| ID    | ID_CASDECMOIS | ID_CAS | ID_DECISION      | MOIS_TRAITE | STATUT_CAS |
|------:|--------------:|-------:|-----------------:|------------:|------------|
| 65126 | 1940165       | 692008 | 2964011027I696731 | 202505      | CAS NOUVEAU |
| 65125 | 1940164       | 692008 | 2964011139I696732 | 202505      | CAS NOUVEAU |

Colonnes principales :

- `ID`
- `ID_CASDECMOIS`
- `ID_CAS`
- `ID_DECISION`
- `MOIS_TRAITE`
- `STATUT_CAS`
- `DATE_DEMANDE_INIT`

Trigger lié :

```sql
CREATE OR REPLACE TRIGGER ANIS.trg_ins_rpccasnvx
BEFORE INSERT ON RPCCASNVX
FOR EACH ROW
BEGIN
  IF :new.ID IS NULL THEN
    SELECT numer_rpccasnvx.nextval INTO :new.ID FROM sys.dual;
  END IF;
END;
/
```

## Table `RPCDECPER`

Exemple de requête filtrant certains identifiants :

```sql
SELECT * FROM anis.RPCDECPER WHERE id_casdecmois IN (...);
```

Les résultats contiennent de nombreux champs décrivant les personnes et
prestations associées. Voici un exemple simplifié :

| ID_DECPER | ID_CASDECMOIS | NAVS13      | CODE_PREST | ETAT_CIVIL | NOM_PREN_CHEF |
|---------:|--------------:|------------:|-----------:|-----------:|---------------|
| 1787853  | 1513013       | 7566729716187 | 10        | ALONE      | Personne A    |

Principales colonnes présentes :

- `ID_DECPER`
- `ID_CASDECMOIS`
- `NAVS13`
- `MANDATAIRE`
- `CODE_PREST`
- `CATE_BESO_V`
- `ETAT_CIVIL`
- `MODE_HABITAT`
- `CANTON_D`
- `COMMUNE_D`
- `CANTON_S`
- `COMMUNE_S`
- `PART_ASSMAL`
- `REVE_B_LUCR`
- `RENTE_TOTALE`
- `LPP`
- `PENS_ETRANGER`
- `AUTRE_REVENU`
- `MT_RETRAIT_LPP`
- `CATE_PART_COUT`
- `PRIME_LAMAL_F`
- `PRIME_LAMAL_E`
- `AUTRE_DEPENSE`
- `REVE_HYPO_B`
- `NUM_CAISSE`
- `AGENCE_CAISSE`
- `RENTE_AVS_AI`
- `ALLOC_IMPOTENT`
- `INDEMNITE_JOUR`
- `PENS_HOTEL`
- `PENS_SOIN`
- `PENS_ASSIST`
- `PENS_COUT`
- `PENS_TOTALE`
- `PENS_PEC`
- `PART_COUT_PC`
- `DEPENSE_PERSO`
- `NUM_PERSONNE`
- `DEGRE_INVALID`
- `BENEF_ALLOC_IMPOTENT`
- `RIP`
- `CHARGE_EXTRA_FAM`

Les colonnes sensibles telles que les nom/prénom ont été remplacées par des
valeurs génériques.

## Dictionnaire de données

### Colonnes de `RPCCASDEC`

| Nom de la colonne | # | Type | Défaut | Non null | Commentaire |
|-------------------|---|------|---------|----------|-------------|
| ID_CASDECMOIS | 1 | NUMBER(12,0) | [NULL] | true | Identifiant unique du cas/décision pour le mois |
| ID_CAS | 2 | VARCHAR2(100) | [NULL] | true | FC1 Identifiant du cas d'affaire |
| ID_DECISION | 3 | VARCHAR2(100) | [NULL] | true | FC36 Identifiant de la décision |
| STATUT | 4 | VARCHAR2(20) | [NULL] | true | Statut de l'enregistrement |
| ID_MESSAGE | 5 | VARCHAR2(36) | [NULL] | false | ID de l'enveloppe Sedex |
| INFO_ERREUR | 6 | VARCHAR2(20) | [NULL] | false | Information sur l'erreur de l'annonce |
| MOIS_TRAITE | 7 | VARCHAR2(6) | [NULL] | true | Mois de traitement sous la forme AAAAMM |
| CODE_DECISION | 8 | NUMBER(1,0) | [NULL] | false | FC2 Genre de la décision |
| DATE_DECISION | 9 | DATE | [NULL] | false | FC3 Date de la décision |
| MOTIF_DECISION | 10 | NUMBER(1,0) | [NULL] | false | FC4 Motif de la décision |
| DATE_DEBUT | 11 | VARCHAR2(7) | [NULL] | false | FC5 Valable du |
| DATE_FIN | 12 | VARCHAR2(7) | [NULL] | false | FC6 Valable jusqu'au |
| D_TRANS_MTMAX | 13 | NUMBER(1,0) | [NULL] | false | FC39 Dispositions transitoires relèvement des montants maximaux |
| D_TRANS_REFPC | 14 | NUMBER(1,0) | [NULL] | false | FC40 Dispositions transitoires réforme des PC |
| MT_SS_ASSMAL | 15 | NUMBER(12,0) | [NULL] | false | FC7 Montant sans assurance maladie |
| MT_AV_ASSMAL | 16 | NUMBER(12,0) | [NULL] | false | FC8 Montant avec assurance maladie |
| LIMITE_PC | 17 | NUMBER(1,0) | [NULL] | false | FC9 Plafonnement des PC |
| NUM_OFFICE | 18 | NUMBER(3,0) | [NULL] | false | FC35 Office PC |
| NUM_AGENCE | 19 | NUMBER(5,0) | [NULL] | false | FC37 Agence PC |
| AUTRE_FORT | 20 | NUMBER(12,0) | [NULL] | false | FC12 Autres fortunes |
| FORT_DESSAISIE | 21 | NUMBER(12,0) | [NULL] | false | FC13 Fortune dessaisie |
| AUTRE_DETTE | 22 | NUMBER(12,0) | [NULL] | false | FC15 Autres dettes |
| FRAN_FORT | 23 | NUMBER(12,0) | [NULL] | false | FC16 Franchise sur fortune |
| FORTUNE_PEC | 24 | NUMBER(12,0) | [NULL] | false | FC18 Fortune à prendre en compte |
| REVENU_FORT | 25 | NUMBER(12,0) | [NULL] | false | FC20 Revenus de la fortune |
| USUFRUIT | 26 | NUMBER(12,0) | [NULL] | false | FC23 Droit d'habitation / usufruit |
| REVENU_F_PEC | 27 | NUMBER(12,0) | [NULL] | false | FC24 Revenus de la fortune pris en compte |
| GAIN_TOT_PEC | 28 | NUMBER(12,0) | [NULL] | false | FC41 Revenu total à prendre en compte |
| TX_REVE_F_PEC | 29 | NUMBER(5,2) | [NULL] | false | FC25 % des revenus de la fortune pris en compte |
| BESOIN_VITAL | 30 | NUMBER(12,0) | [NULL] | false | FC33 Besoins vitaux |
| ENFANT | 31 | NUMBER(12,0) | [NULL] | false | FC34 Enfants participants |
| FORT_IMMO | 32 | NUMBER(12,0) | [NULL] | false | FC10 Fortune immobilière |
| DETTE_HYPOTH | 33 | NUMBER(12,0) | [NULL] | false | FC14 Dettes hypothécaires |
| REVENU_FORT_I | 34 | NUMBER(12,0) | [NULL] | false | FC21 Revenus de la fortune immobilière |
| INTE_HYPOTH | 35 | NUMBER(12,0) | [NULL] | false | FC30 Intérêts hypothécaires |
| FRAIS_ENTRE | 36 | NUMBER(12,0) | [NULL] | false | FC31 Frais d'entretien |
| INTE_H_FRAIS_E | 37 | NUMBER(12,0) | [NULL] | false | FC32 Intérêts hypothécaires / frais de maintenance imputable |
| VALE_IMME_HABI | 38 | NUMBER(12,0) | [NULL] | false | FC11 Valeur de l'immeuble servant d'habitation |
| FRAN_IMME_HABI | 39 | NUMBER(12,0) | [NULL] | false | FC17 Franchise sur l'immeuble servant d'habitation |
| VALE_LOCATIVE | 40 | NUMBER(12,0) | [NULL] | false | FC22 Valeur locative |
| LOYER_B_PEC | 41 | NUMBER(12,0) | [NULL] | false | FC19 Loyer brut à prendre en compte |
| CATE_LOYER | 42 | VARCHAR2(20) | [NULL] | false | FC26 Catégorie de loyer |
| LOYER_B_TOTAL | 43 | NUMBER(12,0) | [NULL] | false | FC27 Loyer brut total |
| PART_LOYER_B | 44 | NUMBER(12,0) | [NULL] | false | FC28 Part du loyer total brut |
| LOYER_MAX | 45 | NUMBER(12,0) | [NULL] | false | FC29 Loyer maximum |
| TYPE_ANNUL | 46 | NUMBER(1,0) | [NULL] | false | C1 Type invalidation/annulation |
| DATECREA | 47 | DATE | [NULL] | true | Date de création de l'enregistrement |
| DATEMSAJ | 48 | DATE | [NULL] | true | Date de dernière mise jour de l'enregistrement |
| NUM_DOSSIER | 49 | NUMBER(12,0) | [NULL] | true | Numéro de dossier Progres |
| NUM_PERS_CHEF | 50 | NUMBER(12,0) | [NULL] | false | Numéro de personne Progres CHEF |
| ID_DECPART | 51 | VARCHAR2(100) | [NULL] | false | FC42 Identifiant de la décision du partenaire |
| NOM_PREN_CHEF | 52 | VARCHAR2(61) | [NULL] | false | Nom et prénom majuscule non accentué du chef Progres |
| DETTE_HYPO_IMMO | 53 | NUMBER | [NULL] | false | FC44 Dettes hypothecaires liees à la fortune immobiliere |
| DETTE_HYPO_HABI | 54 | NUMBER | [NULL] | false | FC43 Dettes hypothecaires liees à l'immeuble servant d'habitation |
| TYPE_DESSAISISSEMENT | 55 | VARCHAR2(200) | [NULL] | false | FC46 Raison du dessaisissement |
| REGION_LOYER | 56 | VARCHAR2(200) | [NULL] | false | FC47 Région de loyer |
| SUPP_FAUTEUIL | 57 | NUMBER | [NULL] | false | FC48 Supplément fauteuil roulant |
| NB_PERSONNE | 58 | NUMBER | [NULL] | false | FC49 Nombre de personne |
| SITUATION_VIE | 59 | VARCHAR2(100) | [NULL] | false | FC50 Situation de vie |
| BASCULE_LPC | 60 | NUMBER | [NULL] | false | 0:droit acquis 1:droit LPC |

### Colonnes de `RPCCASNVX`

| Nom de la colonne | # | Type | Défaut | Non null | Commentaire |
|-------------------|---|------|---------|----------|-------------|
| ID | 1 | NUMBER(12,0) | [NULL] | true | Identifiant unique du cas envoyé |
| ID_CASDECMOIS | 2 | NUMBER(12,0) | [NULL] | true | Identifiant unique du cas/décision pour le mois |
| ID_CAS | 3 | VARCHAR2(100) | [NULL] | true | FC1 Identifiant du cas d'affaire |
| ID_DECISION | 4 | VARCHAR2(100) | [NULL] | true | FC36 Identifiant de la décision |
| MOIS_TRAITE | 5 | VARCHAR2(6) | [NULL] | true | Mois de traitement sous la forme AAAAMM |
| STATUT_CAS | 6 | VARCHAR2(15) | [NULL] | true | Statut du cas à l'envoi CAS NOUVEAU ou MUTATION |
| DATE_DEMANDE_INIT | 7 | DATE | [NULL] | false | FC45 Date demande initiale |

### Colonnes de `RPCDECPER`

| Nom de la colonne | # | Type | Défaut | Non null | Commentaire |
|-------------------|---|------|---------|----------|-------------|
| ID_DECPER | 1 | NUMBER(12,0) | [NULL] | true | Identifiant unique du décision/personne pour le mois |
| ID_CASDECMOIS | 2 | NUMBER(12,0) | [NULL] | true | Identifiant unique du cas/décision pour le mois |
| NAVS13 | 3 | NUMBER(13,0) | [NULL] | false | P1 Numéro AVS de la personne |
| MANDATAIRE | 4 | NUMBER(1,0) | [NULL] | false | P2 Mandataire |
| CODE_PREST | 5 | NUMBER(3,0) | [NULL] | false | P3 Genre de prestation |
| CATE_BESO_V | 6 | VARCHAR2(20) | [NULL] | false | P4 Catégorie des besoins vitaux |
| ETAT_CIVIL | 7 | NUMBER(1,0) | [NULL] | false | P5 Etat civil |
| MODE_HABITAT | 8 | VARCHAR2(10) | [NULL] | false | P12 Mode d'habitation |
| CANTON_D | 9 | VARCHAR2(2) | [NULL] | false | P10 Canton adresse légale |
| COMMUNE_D | 10 | NUMBER(4,0) | [NULL] | false | P6 Commune adresse légale |
| CANTON_S | 11 | VARCHAR2(2) | [NULL] | false | P13 Canton adresse séjour |
| COMMUNE_S | 12 | NUMBER(4,0) | [NULL] | false | P11 Commune adresse séjour |
| PART_ASSMAL | 13 | NUMBER(12,0) | [NULL] | false | E5 Prestations de la LAMal et de la LCA |
| REVE_B_LUCR | 14 | NUMBER(12,0) | [NULL] | false | E6 Revenu brut d'activité lucrative |
| RENTE_TOTALE | 15 | NUMBER(12,0) | [NULL] | false | E12 Total des rentes (exclus la rente AVS/AI E2) |
| LPP | 16 | NUMBER(12,0) | [NULL] | false | E10 Rente LPP |
| PENS_ETRANGER | 17 | NUMBER(12,0) | [NULL] | false | E11 Rente étrangère |
| AUTRE_REVENU | 18 | NUMBER(12,0) | [NULL] | false | E13 Autres revenus |
| MT_RETRAIT_LPP | 19 | NUMBER(12,0) | [NULL] | false | E14 Montant retrait 2ème pilier |
| CATE_PART_COUT | 20 | VARCHAR2(30) | [NULL] | false | E21 Catégorie de participation aux coûts du patient |
| PRIME_LAMAL_F | 21 | NUMBER(12,0) | [NULL] | false | E24 Prime LAMal, participation forfaitaire |
| PRIME_LAMAL_E | 22 | NUMBER(12,0) | [NULL] | false | E25 Prime LAMal, participation effective |
| AUTRE_DEPENSE | 23 | NUMBER(12,0) | [NULL] | false | E26 Autres dépenses |
| REVE_HYPO_B | 24 | NUMBER(12,0) | [NULL] | false | E28 Revenu hypothétique brut |
| NUM_CAISSE | 25 | NUMBER(3,0) | [NULL] | false | E1 Caisse de compensation payant la rente |
| AGENCE_CAISSE | 26 | NUMBER(5,0) | [NULL] | false | E27 Agence payant la rente |
| RENTE_AVS_AI | 27 | NUMBER(12,0) | [NULL] | false | E2 Rente AVS/AI |
| ALLOC_IMPOTENT | 28 | NUMBER(12,0) | [NULL] | false | E3 Allocation pour impotent |
| INDEMNITE_JOUR | 29 | NUMBER(12,0) | [NULL] | false | E4 Indemnités journalières |
| PENS_HOTEL | 30 | NUMBER(12,0) | [NULL] | false | E15 Taxe de home : hôtellerie |
| PENS_SOIN | 31 | NUMBER(12,0) | [NULL] | false | E16 Taxe de home : soins |
| PENS_ASSIST | 32 | NUMBER(12,0) | [NULL] | false | E17 Taxe de home : assistance |
| PENS_COUT | 33 | NUMBER(12,0) | [NULL] | false | E18 Taxe de home : participation coûts patient |
| PENS_TOTALE | 34 | NUMBER(12,0) | [NULL] | false | E19 Taxe de home : total |
| PENS_PEC | 35 | NUMBER(12,0) | [NULL] | false | E20 Taxe de home à prendre en compte |
| PART_COUT_PC | 36 | NUMBER(12,0) | [NULL] | false | E22 Participation aux coûts des patients dans le calcul des PC |
| DEPENSE_PERSO | 37 | NUMBER(12,0) | [NULL] | false | E23 Dépenses personnelles |
| NUM_PERSONNE | 38 | NUMBER(12,0) | [NULL] | true | Numéro de personne Progres |
| DEGRE_INVALID | 39 | NUMBER | [NULL] | false | P15 Degré invalidité |
| BENEF_ALLOC_IMPOTENT | 40 | NUMBER | [NULL] | false | E31 Bénéficiaire allocation impotent |
| RIP | 41 | NUMBER | [NULL] | false | E29 réduction cantonale individuelle de prime (LAMal) |
| CHARGE_EXTRA_FAM | 42 | NUMBER | [NULL] | false | E30 charges extra-familiales |

## Notes complémentaires

- Les requêtes ci-dessus proviennent du schéma `ANIS` et illustrent la structure
  des données sans exposer d'informations confidentielles.
- Certains champs peuvent être `NULL` selon la situation ou le type de
  prestation accordée.
- Les montants sont exprimés en centimes de franc suisse lorsqu'ils sont de
  type `NUMBER`.

