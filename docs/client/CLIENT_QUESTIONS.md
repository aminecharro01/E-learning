# Questions client — IAT Academy

**Réunion du :** _______________  
**Présents (école) :** _______________  
**Présents (projet) :** _______________  
**Objectif :** valider les règles métier et le périmètre avant la suite.

> Écrire les réponses à la main ou au clavier sous chaque question.  
> Cases à cocher : `[x]` = validé.

---

## A. Périmètre & livraison

### A1. Quelle date visez-vous pour la mise en production / UAT ?

**Proposition / note :** _______________

**Réponse :**

```
_______________________________________________
_______________________________________________
_______________________________________________
```



### A2. Hébergement : Hostinger VPS confirmé ? Domaine / sous-domaine prévu ?

**Réponse :**

```
_______________________________________________
_______________________________________________
```



### A3. Qui fournit et saisit le contenu des 20 modules (vidéos, PDF, textes, quiz) ?

- [ ] École (formateurs)
- [ ] Nous (intégration technique seulement)
- [ ] Mixte — préciser :

**Réponse :**

```
_______________________________________________
_______________________________________________
```



### A4. Les modules 6–20 : contenu réel déjà prêt, ou placeholders acceptables pour la V1 ?

**Réponse :**

```
_______________________________________________
_______________________________________________
```

---



## B. Règles de quiz (à confirmer)

*Valeurs actuelles / proposées dans la fiche fonctionnelle.*

### B1. Score minimum **quiz fin de module**

**Proposition :** 60 %  
**Décision :** _____ %  

**Notes :**

```
_______________________________________________
```



### B2. Score minimum **quiz final de certification** (si demandé)

**Proposition :** 80 %  
**Décision :** _____ % · Ou non requis : [ ]  

**Notes :**

```
_______________________________________________
```



### B3. Nombre de tentatives — fin de module

**Proposition :** 2  
**Décision :** _____  

**Notes :**

```
_______________________________________________
```



### B4. Nombre de tentatives — quiz final

**Proposition :** 1  
**Décision :** _____  

**Notes :**

```
_______________________________________________
```



### B5. Délai (cooldown) après un échec avant de retenter

**Proposition :** 24 h (module) / 48 h (final)  
**Décision :**

```
_______________________________________________
```



### B6. Durée max d’un quiz

**Proposition :** 30 min (fin de module) / 60 min (final)  
**Décision :**

```
_______________________________________________
```



### B7. Le **quiz applicatif** (en cours de section) doit-il bloquer la progression ?

**Proposition :** Non (formatif seulement)  

- [ ] Non bloquant (OK)
- [ ] Oui, obligatoire avant la suite

**Notes :**

```
_______________________________________________
```



### B8. Affichage de la correction après soumission ?

**Proposition :** immédiat avec explications  

- [ ] Immédiat
- [ ] Après toutes les tentatives
- [ ] Jamais (score seulement)
- [ ] Autre :

**Réponse :**

```
_______________________________________________
```



### B9. Faut-il un **quiz pratique** et un **quiz final** distincts du quiz fin de module ? (prévu dans le guide client, pas encore dans le MVP)

- [ ] Oui — prioritaire avant prod
- [ ] Oui — phase 2
- [ ] Non — fin de module + attestation suffisent

**Notes :**

```
_______________________________________________
_______________________________________________
```

---



## C. Progression & leçons



### C1. Quand une leçon vidéo est-elle « terminée » ?

**Proposition :** visionnage ≥ 90 %  
**Décision :** _____ %  

**Notes :**

```
_______________________________________________
```



### C2. Leçons texte / PDF uniquement : bouton « Marquer comme terminé » OK, ou autre règle ?

**Réponse :**

```
_______________________________________________
_______________________________________________
```



### C3. Progression strictement linéaire (module N+1 verrouillé tant que N non validé) ?

- [ ] Oui, obligatoire
- [ ] Non — accès libre à tous les modules
- [ ] Hybride (préciser) :

**Réponse :**

```
_______________________________________________
```



### C4. L’admin peut-il **débloquer manuellement** un module pour un apprenant (cas exception) ?

- [ ] Oui
- [ ] Non
- [ ] Oui, avec journal / justification

**Notes :**

```
_______________________________________________
```

---



## D. Attestation / diplôme



### D1. Conditions pour délivrer l’attestation PDF ?

**Proposition actuelle MVP :** 100 % des modules validés (leçons + quiz fin de module).  

**Décision :**

```
_______________________________________________
_______________________________________________
```



### D2. Faut-il une **page publique de vérification** du code (employeur / école) ?

- [ ] Oui — prioritaire
- [ ] Oui — plus tard
- [ ] Non

**Notes :**

```
_______________________________________________
```



### D3. Mentions obligatoires sur le PDF (logo, n° diplôme, signatures, QR code) ?

**Réponse :**

```
_______________________________________________
_______________________________________________
_______________________________________________
```



### D4. Durée de validité de l’accès formation après inscription / paiement ?

**Proposition :** illimité vs 12 mois  
**Décision :**

```
_______________________________________________
```

---



## E. Utilisateurs & rôles



### E1. Qui crée les comptes apprenants ?

- [ ] Auto-inscription ouverte
- [ ] Admin crée / importe (CSV)
- [ ] Les deux

**Notes :**

```
_______________________________________________
```



### E2. Rôle **Formateur** : accès uniquement à « ses » modules, ou à toute la formation ?

**Proposition spec :** ses modules seulement (pas encore scopé côté technique).  

**Décision :**

```
_______________________________________________
```



### E3. Faut-il un rôle **Support** (lecture seule, aide aux apprenants) ?

- [ ] Oui
- [ ] Non
- [ ] Plus tard

**Notes :**

```
_______________________________________________
```



### E4. Mot de passe oublié : reset par email automatique, ou uniquement via admin / support ?

**Réponse :**

```
_______________________________________________
```



### E5. Langue de l’interface : français seulement, ou FR + EN ?

**Réponse :**

```
_______________________________________________
```

---



## F. Contenu & médias



### F1. Taille / formats max des vidéos (ex. 500 Mo, MP4, HLS) ?

**Réponse :**

```
_______________________________________________
```



### F2. Les vidéos viennent-elles d’un drive / YouTube privé / upload direct plateforme ?

**Réponse :**

```
_______________________________________________
```



### F3. Newsletter / formulaire contact de la landing : vraiment utilisés, ou décoratifs pour la V1 ?

- [ ] À brancher (email / CRM)
- [ ] Démo visuelle seulement pour l’instant

**Notes :**

```
_______________________________________________
```

---



## G. Déploiement & exploitation



### G1. Qui administre le VPS au quotidien (mises à jour, backups) ?

**Réponse :**

```
_______________________________________________
```



### G2. Besoin de sauvegardes quotidiennes BDD + médias ?

- [ ] Oui
- [ ] Non / plus tard

**Notes :**

```
_______________________________________________
```



### G3. Environnement de **préprod / staging** souhaité avant la prod ?

- [ ] Oui
- [ ] Non — déploiement direct

---



## H. Priorités après cette démo

Cocher **top 3** pour la prochaine itération :

- [ ] Contenu modules 6–20
- [ ] Quiz pratique + quiz final
- [ ] Page vérification attestation
- [ ] Reset mot de passe (email)
- [ ] Import CSV apprenants
- [ ] Déploiement production Hostinger
- [ ] Stats / reporting avancé
- [ ] Scoping formateur par module
- [ ] Autre : _______________

**Commentaire libre :**

```
_______________________________________________
_______________________________________________
_______________________________________________
_______________________________________________
```

---



## Décisions prises aujourd’hui (synthèse)


| #   | Sujet | Décision | Owner | Échéance |
| --- | ----- | -------- | ----- | -------- |
| 1   |       |          |       |          |
| 2   |       |          |       |          |
| 3   |       |          |       |          |
| 4   |       |          |       |          |
| 5   |       |          |       |          |


**Prochaine réunion :** _______________  
**Signature / validation orale :** _______________