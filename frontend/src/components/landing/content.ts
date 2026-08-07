/**
 * Contenu landing — aligné programme IAT (2 ans), sans exposer modules ni codes UF.
 * Photos Facebook + compléments libres dans /public/images/landing/
 */

const img = (name: string) => `/images/landing/${name}`;

export const iat = {
  brand: "IAT Academy",
  fullName: "Académie internationale des compagnies aériennes et du tourisme",
  tagline: "Formez-vous aux métiers de l'air, de l'accueil et du tourisme.",
  subtitle:
    "Cycle professionnel sur deux années — hôtesse de l'air, steward, tourisme et aéronautique — avec un espace apprenant en ligne et un accompagnement jusqu'au diplôme.",
  phone: "+212 675 096 134",
  phoneHref: "tel:+212675096134",
  email: "contact@iat-academia.com",
  emailHref: "mailto:contact@iat-academia.com",
  website: "https://iat-academie.com/",
  facebook: "https://www.facebook.com/",
  aboutLead: "Une académie tournée vers les carrières internationales",
  about:
    "IAT Academy prépare aux métiers de l'aviation commerciale, de l'accueil aéroportuaire et du tourisme. La formation combine savoirs métiers, langues professionnelles et mise en situation, pour une insertion concrète dans le secteur.",
  mission:
    "Accompagner chaque apprenant du premier jour jusqu'à la remise du diplôme : un parcours structuré sur deux années, une pédagogie par la pratique, et un suivi personnalisé.",
  coursesApproach:
    "Le parcours couvre la communication professionnelle, l'accueil touristique et aéroportuaire, l'environnement aéronautique, le service à bord, puis la gestion, la vente et la préparation à l'emploi — sans publier le détail pédagogique en ligne.",
  method:
    "Cours en présentiel et ressources numériques, stages en milieu réel, puis travaux de synthèse et soutenance. L'accès à la plateforme e-learning est activé par l'académie après inscription et paiement.",
  journeyLead: "Un parcours en deux temps",
  journey: [
    {
      title: "Première année",
      description:
        "Fondations métiers : langues et communication, accueil et tourisme, environnement aéronautique, connaissances complémentaires, puis stage en milieu réel.",
    },
    {
      title: "Deuxième année",
      description:
        "Approfondissement : expression professionnelle, exploitation touristique et aéronautique, outils de gestion, culture d'entreprise, puis soutenance et diplôme.",
    },
  ],
  /** Axes publics — thèmes issus du programme, sans lister les modules */
  expertise: [
    {
      id: "communication",
      title: "Langues & communication",
      subtitle: "Relation client",
      description:
        "Techniques de communication, comportement professionnel et langues (français, anglais…) pour évoluer avec aisance face aux passagers et aux équipes.",
      accent: "cabin" as const,
      image: img("students.jpg"),
      imageAlt: "Apprenants IAT Academy en session de communication",
    },
    {
      id: "tourism-airport",
      title: "Tourisme & aéroports",
      subtitle: "Accueil & exploitation",
      description:
        "Accueil, animation, agences de voyage et exploitation aéroportuaire : les gestes du terrain pour accompagner le voyageur de bout en bout.",
      accent: "airport" as const,
      image: img("stock-airport.jpg"),
      imageAlt: "Opérations aéroportuaires et accueil passagers",
    },
    {
      id: "aeronautics",
      title: "Environnement aéronautique",
      subtitle: "Sûreté & réglementation",
      description:
        "Culture aéronautique, réglementation, sûreté et bases de secourisme — le socle indispensable pour évoluer dans le monde du transport aérien.",
      accent: "cabin" as const,
      image: img("axis-aeronautics.jpg"),
      imageAlt: "Environnement aéronautique",
    },
    {
      id: "cabin-ops",
      title: "Service à bord & sûreté",
      subtitle: "Métier PNC",
      description:
        "Sécurité en cabine, assistance passagers, secourisme et travail d'équipage : les compétences du personnel navigant commercial.",
      accent: "maritime" as const,
      image: img("teacherExplaining.jpg"),
      imageAlt: "Démonstration secourisme en formation IAT Academy",
    },
    {
      id: "management",
      title: "Gestion & vente",
      subtitle: "Outils professionnels",
      description:
        "Marketing touristique, techniques de vente, outils numériques et culture d'entreprise pour renforcer votre employabilité.",
      accent: "tourism" as const,
      image: img("axis-management.jpg"),
      imageAlt: "Gestion et travail d'équipe",
    },
    {
      id: "career",
      title: "Stage, insertion & diplôme",
      subtitle: "Vers l'emploi",
      description:
        "Immersion en entreprise, accompagnement à la recherche d'emploi, soutenance et remise du diplôme à l'école — un seul diplôme pour le cycle complet.",
      accent: "tourism" as const,
      image: img("studentpracticing.jpg"),
      imageAlt: "Mise en pratique et préparation métier — IAT Academy",
    },
  ],
  heroImage: img("classRoom.jpg"),
  heroImageAlt: "Session de formation en cours — IAT Academy",
  heroSecondaryImage: img("students.jpg"),
  heroSecondaryAlt: "Apprenants IAT Academy",
  why: [
    {
      title: "Équipe pédagogique de terrain",
      description:
        "Des formateurs issus de l'aviation, de l'accueil et du tourisme, proches des attentes des compagnies et des opérateurs.",
      image: img("teacherExplaining1.jpg"),
      imageAlt: "Formateur IAT Academy en session",
    },
    {
      title: "Un diplôme en fin de parcours",
      description:
        "Cycle certifiant sur deux années : le diplôme est remis physiquement à l'académie après validation du parcours.",
      image: img("social-promo.jpg"),
      imageAlt: "Promotion et parcours IAT Academy",
    },
    {
      title: "Stage en milieu réel",
      description:
        "Une immersion professionnelle intégrée au parcours, pour confronter les acquis au quotidien du secteur.",
      image: img("studentpracticing1.jpg"),
      imageAlt: "Pratique et immersion — IAT Academy",
    },
  ],
  platformBenefits: [
    "Cycle professionnel sur 2 années",
    "Espace apprenant en ligne",
    "Stage & accompagnement jusqu'au diplôme",
  ],
  nav: [
    { label: "Accueil", href: "#home" },
    { label: "À propos", href: "#about" },
    { label: "Parcours", href: "#expertise" },
    { label: "Pourquoi IAT", href: "#why" },
    { label: "Contact", href: "#contact" },
  ],
} as const;
