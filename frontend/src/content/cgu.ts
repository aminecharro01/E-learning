/**
 * Conditions Générales d'Utilisation — plateforme e-learning IAT Academy.
 * Document informatif ; à faire valider par un conseil juridique si besoin.
 */

import { iat } from "@/components/landing/content";

export type CguSection = {
  id: string;
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

export const cguMeta = {
  title: "Conditions Générales d'Utilisation",
  shortTitle: "CGU",
  lastUpdated: "22 juillet 2026",
  version: "1.0",
};

export const cguIntro = `Les présentes Conditions Générales d'Utilisation (ci-après « CGU ») régissent l'accès et l'utilisation de la plateforme e-learning de ${iat.brand} (${iat.fullName}). En créant un compte ou en utilisant la plateforme, vous acceptez sans réserve les présentes CGU.`;

export const cguSections: CguSection[] = [
  {
    id: "objet",
    title: "1. Objet",
    paragraphs: [
      `Les présentes CGU ont pour objet de définir les conditions d'accès et d'utilisation de la plateforme numérique proposée par ${iat.brand}, destinée aux apprenants, formateurs et administrateurs dans le cadre des formations professionnelles (aviation, accueil, tourisme et métiers associés).`,
      "Elles complètent, le cas échéant, le règlement intérieur de l'académie et les modalités pédagogiques communiquées lors de l'inscription administrative.",
    ],
  },
  {
    id: "definitions",
    title: "2. Définitions",
    paragraphs: ["Au sens des présentes CGU, on entend par :"],
    bullets: [
      `« Plateforme » : l'application web e-learning éditée par ${iat.brand}, accessible via Internet.`,
      "« Utilisateur » : toute personne disposant d'un compte (apprenant, formateur, administrateur).",
      "« Apprenant » : utilisateur inscrit au parcours de formation et autorisé à consulter les contenus pédagogiques.",
      "« Compte » : espace personnel protégé par identifiants (adresse e-mail et mot de passe).",
      "« Contenu » : modules, sections, documents, vidéos, quiz, attestations et tout élément mis à disposition sur la plateforme.",
    ],
  },
  {
    id: "acces",
    title: "3. Accès à la plateforme",
    paragraphs: [
      "L'accès à la plateforme nécessite une connexion Internet et un navigateur à jour. Certains contenus (vidéos, PDF) peuvent exiger une bande passante suffisante.",
      `${iat.brand} s'efforce d'assurer une disponibilité raisonnable du service, sans garantie d'accès ininterrompu. Des opérations de maintenance peuvent temporairement suspendre l'accès.`,
    ],
  },
  {
    id: "inscription",
    title: "4. Inscription et compte utilisateur",
    paragraphs: [
      "La création d'un compte suppose la fourniture d'informations exactes et à jour (civilité, identité, coordonnées, niveau d'études, etc.).",
      "L'Utilisateur est responsable de la confidentialité de ses identifiants et de toute activité réalisée via son compte. Toute utilisation frauduleuse doit être signalée sans délai à l'académie.",
      "Un compte apprenant peut être créé en ligne ; l'activation pédagogique peut être conditionnée à la validation administrative et au règlement des frais selon les modalités de l'académie.",
    ],
  },
  {
    id: "activation",
    title: "5. Activation, paiement et parcours",
    paragraphs: [
      "Le paiement des frais de formation s'effectue hors plateforme, selon les procédures de l'académie. L'accès aux modules peut rester bloqué tant que le compte n'a pas été activé par l'administration.",
      "Le parcours (années, unités de formation, stages, soutenance) est défini par le programme pédagogique de l'académie. La plateforme sert d'outil d'apprentissage et de suivi ; elle ne remplace pas les obligations de présence ou d'évaluation en présentiel lorsqu'elles s'appliquent.",
    ],
  },
  {
    id: "utilisation",
    title: "6. Utilisation autorisée",
    paragraphs: ["L'Utilisateur s'engage à utiliser la plateforme de manière loyale et conforme à sa destination pédagogique. Il est notamment interdit de :"],
    bullets: [
      "Partager, revendre ou diffuser les contenus hors du cadre autorisé.",
      "Contourner les contrôles d'accès, quiz, verrouillages de modules ou mesures de sécurité.",
      "Tenter d'accéder aux données d'autres utilisateurs.",
      "Introduire des virus, scripts malveillants ou saturations du service.",
      "Usurper l'identité d'un tiers ou fournir des informations mensongères.",
    ],
  },
  {
    id: "propriete",
    title: "7. Propriété intellectuelle",
    paragraphs: [
      `Les contenus de la plateforme (textes, médias, structure pédagogique, logos, charte graphique) sont protégés. Sauf autorisation écrite de ${iat.brand}, toute reproduction, représentation, adaptation ou exploitation commerciale est interdite.`,
      "L'Utilisateur conserve la propriété de ses éventuels documents personnels déposés (ex. dossier de stage), et accorde à l'académie une licence non exclusive pour les traiter aux fins pédagogiques et administratives nécessaires.",
    ],
  },
  {
    id: "obligations",
    title: "8. Obligations de l'apprenant",
    paragraphs: [
      "L'apprenant s'engage à suivre les modules mis à sa disposition, à réaliser les évaluations de bonne foi, et à respecter le calendrier et les consignes communiquées par l'académie.",
      "Les résultats des quiz et la progression enregistrée sur la plateforme peuvent être utilisés pour le suivi pédagogique et, le cas échéant, pour la validation de certaines étapes du parcours.",
    ],
  },
  {
    id: "donnees",
    title: "9. Protection des données personnelles",
    paragraphs: [
      `${iat.brand} collecte et traite des données personnelles (identité, coordonnées, parcours scolaire, données de connexion et de progression) pour la gestion des candidatures, l'accès à la plateforme, le suivi pédagogique et les communications liées à la formation.`,
      "Ce traitement est réalisé conformément à la loi n° 09-08 relative à la protection des personnes physiques à l'égard du traitement des données à caractère personnel, et aux autorisations applicables auprès de la Commission Nationale de Contrôle de la Protection des Données à Caractère Personnel (CNDP), le cas échéant.",
      `Conformément à la loi 09-08, vous disposez d'un droit d'accès, de rectification et d'opposition. Pour l'exercer, contactez le service admissions / confidentialité à l'adresse : ${iat.email}.`,
      "En cochant la case d'acceptation lors de l'inscription, vous consentez également à recevoir, par e-mail, des informations sur les actualités et offres de l'organisation, sous réserve de votre droit d'opposition ultérieur.",
    ],
  },
  {
    id: "responsabilite",
    title: "10. Responsabilité",
    paragraphs: [
      `${iat.brand} met en œuvre des moyens raisonnables pour sécuriser la plateforme et fiabiliser les contenus. Elle ne saurait être tenue responsable des dommages indirects, pertes de données imputables à l'utilisateur, ou interruptions liées à Internet, aux prestataires tiers ou à un cas de force majeure.`,
      "L'Utilisateur demeure responsable de la sauvegarde de ses documents personnels et de l'usage qu'il fait des informations consultées.",
    ],
  },
  {
    id: "suspension",
    title: "11. Suspension et résiliation",
    paragraphs: [
      "L'académie peut suspendre ou clôturer un compte en cas de manquement aux présentes CGU, de non-paiement, de fraude, ou sur décision administrative légitime.",
      "L'Utilisateur peut demander la clôture de son compte en contactant l'administration. Certaines données pourront être conservées le temps nécessaire aux obligations légales ou pédagogiques.",
    ],
  },
  {
    id: "modifications",
    title: "12. Modification des CGU",
    paragraphs: [
      `${iat.brand} peut modifier les présentes CGU pour tenir compte de l'évolution de la plateforme, de la réglementation ou de l'organisation pédagogique. La version applicable est celle publiée sur cette page, avec indication de la date de mise à jour.`,
      "En cas de modification substantielle, une information pourra être communiquée via la plateforme ou par e-mail.",
    ],
  },
  {
    id: "droit",
    title: "13. Droit applicable et contact",
    paragraphs: [
      "Les présentes CGU sont régies par le droit marocain. Tout litige relatif à leur interprétation ou exécution sera soumis, à défaut d'accord amiable, aux juridictions compétentes.",
      `Pour toute question relative aux CGU ou à la plateforme : ${iat.email} — ${iat.phone}. Site : ${iat.website}`,
    ],
  },
];
