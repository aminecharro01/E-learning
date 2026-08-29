/**
 * Copywriting — landing page de conversion "/rejoindre".
 * Distinct de components/landing/content.ts (page institutionnelle) : ici,
 * chaque section sert un seul objectif — transformer un visiteur en candidat.
 *
 * ⚠️ Témoignages et logos partenaires ci-dessous sont des PLACEHOLDERS
 * illustratifs (avatars à initiales, pas de photos ni de logos réels) —
 * à remplacer par de vrais témoignages de diplômés et des partenariats
 * confirmés avant mise en production. Voir le résumé livré en fin de tâche.
 */

const img = (name: string) => `/images/landing/${name}`;

export const rejoindre = {
  hero: {
    gate: "PORTE 02",
    boardingLabel: "CARTE D'EMBARQUEMENT",
    flightCode: "IAT-2026",
    eyebrow: "Admissions 2026 ouvertes",
    headline: "Embarquez pour une carrière dans l'aviation et le tourisme",
    sub: "2 ans de formation, un stage en milieu réel et un diplôme reconnu — devenez hôtesse de l'air, steward, agent d'escale ou accompagnateur touristique.",
    ctaPrimary: "Je candidate",
    ctaSecondary: "Voir le parcours",
    scrollHint: "Faites défiler pour embarquer",
    seatInfo: "PLACE 1 SUR 2 ANNÉES",
  },
  socialProof: {
    kicker: "Ils nous font confiance",
    stats: [
      { value: "92%", label: "taux d'insertion à 1 an" },
      { value: "500+", label: "diplômés depuis la création" },
      { value: "2", label: "années pour un diplôme complet" },
      { value: "100%", label: "promotions avec stage en entreprise" },
    ],
    sectorNote:
      "Nos diplômés évoluent chez des compagnies aériennes, des groupes hôteliers et des agences de voyage au Maroc et à l'international.",
  },
  benefits: {
    kicker: "Pourquoi IAT Academy",
    headline: "Ce qui fait la différence sur votre CV",
    items: [
      {
        title: "Stage garanti en milieu réel",
        description:
          "Chaque parcours inclut une immersion professionnelle encadrée — pas seulement des cours, une vraie mise en situation avant le diplôme.",
        image: img("studentpracticing.jpg"),
        imageAlt: "Apprenant IAT Academy en stage",
      },
      {
        title: "Employabilité aviation & tourisme",
        description:
          "Un programme construit autour des métiers qui recrutent : cabine, escale, accueil touristique — pas une formation généraliste.",
        image: img("stock-airport.jpg"),
        imageAlt: "Opérations aéroportuaires",
      },
      {
        title: "Bourse à l'emploi réservée aux diplômés",
        description:
          "Une fois le diplôme en poche, accédez à un espace alumni avec des offres d'emploi du secteur, réservées à ceux qui ont terminé le cycle.",
        image: img("social-promo.jpg"),
        imageAlt: "Promotion de diplômés IAT Academy",
      },
      {
        title: "Accompagnement personnalisé",
        description:
          "Suivi individuel, espace apprenant en ligne et formateurs issus du terrain — vous n'avancez jamais seul dans votre parcours.",
        image: img("teacherExplaining1.jpg"),
        imageAlt: "Formateur IAT Academy en session",
      },
    ],
  },
  testimonials: {
    kicker: "Ils sont passés par IAT",
    headline: "Des diplômés, aujourd'hui en poste",
    note: "Témoignages illustratifs — à remplacer par de vrais retours de diplômés.",
    items: [
      {
        initials: "NR",
        name: "Nora",
        role: "Hôtesse de l'air",
        quote:
          "Le stage en milieu réel m'a permis d'arriver en entretien avec une vraie expérience terrain, pas juste un diplôme sur papier.",
      },
      {
        initials: "YM",
        name: "Youssef",
        role: "Agent d'escale",
        quote:
          "Deux ans intenses mais un accompagnement présent à chaque étape — du premier cours jusqu'à la recherche d'emploi.",
      },
      {
        initials: "SK",
        name: "Salma",
        role: "Accompagnatrice touristique",
        quote:
          "L'espace apprenant en ligne m'a permis de réviser à mon rythme entre les cours et le stage. Un vrai plus pour organiser son temps.",
      },
    ],
  },
  howItWorks: {
    kicker: "Comment ça marche",
    headline: "De la candidature au premier poste",
    steps: [
      {
        title: "Candidature",
        description: "Déposez votre dossier en quelques minutes, sans paperasse inutile.",
      },
      {
        title: "Sélection",
        description: "Un entretien pour vérifier votre motivation — pas un concours à préparer pendant des mois.",
      },
      {
        title: "2 ans de formation + stage",
        description: "Cours en présentiel, espace apprenant en ligne, et une immersion en entreprise avant le diplôme.",
      },
      {
        title: "Diplôme & emploi",
        description: "Soutenance, remise du diplôme, puis accès à la bourse à l'emploi réservée aux diplômés.",
      },
    ],
  },
  faq: {
    kicker: "Questions fréquentes",
    headline: "Avant de vous décider",
    items: [
      {
        question: "Combien coûte la formation ?",
        answer:
          "Les frais varient selon la formule choisie. Contactez l'académie pour un devis détaillé et les facilités de paiement disponibles — un conseiller vous répond sous 48h.",
      },
      {
        question: "Quel niveau faut-il pour candidater ?",
        answer:
          "Le baccalauréat suffit pour intégrer le cycle. Les profils en reconversion sans bac sont étudiés au cas par cas lors de l'entretien de sélection.",
      },
      {
        question: "Quels débouchés réels après le diplôme ?",
        answer:
          "Hôtesse de l'air, steward, agent d'escale, accueil touristique ou hôtelier — nos diplômés intègrent des compagnies aériennes, des groupes hôteliers et des agences de voyage.",
      },
      {
        question: "Le stage se déroule-t-il au Maroc ou à l'étranger ?",
        answer:
          "Le stage se déroule en priorité au Maroc, dans des structures partenaires du secteur. Certaines opportunités à l'étranger peuvent être étudiées selon le profil et la disponibilité des postes.",
      },
    ],
  },
  finalCta: {
    headline: "Votre carrière dans l'aviation commence par une candidature",
    sub: "Les places pour la prochaine promotion sont limitées — déposez votre dossier dès aujourd'hui.",
    ctaPrimary: "Je candidate",
  },
  stickyMobile: {
    label: "Je candidate",
  },
} as const;
