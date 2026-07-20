/** Content basé sur https://iat-academie.com/ */

export const iat = {
  brand: "IAT Academy",
  fullName: "International Airlines & Tourism Academy",
  tagline: "Votre passerelle vers les carrières de l'aviation, du maritime et du tourisme.",
  subtitle:
    "École de formation pour hôtesses de l'air, stewards, agents d'escale, équipages de croisière et métiers du tourisme.",
  phone: "+212 675 096 134",
  phoneHref: "tel:+212675096134",
  email: "contact@iat-academia.com",
  emailHref: "mailto:contact@iat-academia.com",
  website: "https://iat-academie.com/",
  aboutLead: "Un défi porté par une équipe d'experts",
  about:
    "IAT Academy est un établissement de formation professionnelle spécialisé dans les carrières de l'aviation, des services maritimes et du tourisme. Notre équipe pédagogique est composée de professionnels expérimentés issus des secteurs aérien, maritime et touristique, avec une double expertise réglementaire et commerciale.",
  mission:
    "Accompagner les jeunes dans la construction de carrières réussies grâce à une formation pluridisciplinaire alignée sur les exigences des marchés nationaux et internationaux. Ouverte à partir du baccalauréat, l'Academy ouvre la voie à des opportunités mondiales.",
  coursesApproach:
    "Nos formations transmettent les savoirs et compétences clés de chaque métier, ancrés dans la pratique et les attentes du secteur.",
  method:
    "L'approche pédagogique d'IAT Academy repose sur le Learning by Doing, avec un accompagnement personnalisé tout au long du parcours.",
  expertise: [
    {
      id: "cabin-crew",
      title: "Cabin Crew Training",
      subtitle: "Hôtesses de l'air & Stewards (PNC)",
      description:
        "Le métier d'hôtesse / steward reste l'une des carrières les plus convoitées. En tant que visage des compagnies aériennes, le PNC assure sécurité, confort et service d'exception à bord.",
      accent: "cabin",
      image:
        "https://images.unsplash.com/photo-1585518419759-7fe2e0fbf8a6?auto=format&fit=crop&w=900&q=80",
      imageAlt: "Cabine d'avion — formation PNC",
    },
    {
      id: "airport",
      title: "Airport Operations",
      subtitle: "Agent de service passagers (ACE)",
      description:
        "Les agents ACE sont essentiels à la performance des compagnies : enregistrement, bagages et assistance passagers au sol.",
      accent: "airport",
      image:
        "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=900&q=80",
      imageAlt: "Aéroport — opérations passagers",
    },
    {
      id: "maritime",
      title: "Maritime & Cruise Careers",
      subtitle: "Équipages de croisière",
      description:
        "Les compagnies de croisière recherchent en permanence des équipages motivés et qualifiés pour des rôles dynamiques à bord.",
      accent: "maritime",
      image:
        "https://images.unsplash.com/photo-1548574505-5e239809ee19?auto=format&fit=crop&w=900&q=80",
      imageAlt: "Navire de croisière",
    },
    {
      id: "tourism",
      title: "Tourism & Hospitality",
      subtitle: "Animation & expériences clients",
      description:
        "Créer des expériences mémorables dans les resorts, hôtels et navires de croisière — au cœur des métiers du tourisme.",
      accent: "tourism",
      image:
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=80",
      imageAlt: "Hôtellerie et tourisme",
    },
  ],
  heroImage:
    "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1600&q=80",
  heroImageAlt: "Avion en vol — formation aviation IAT Academy",
  heroSecondaryImage:
    "https://images.unsplash.com/photo-1556388158-158ea5ccacbd?auto=format&fit=crop&w=900&q=80",
  heroSecondaryAlt: "Terminal aéroportuaire — opérations au sol",
  why: [
    {
      title: "Formateurs experts du secteur",
      description: "Professionnels issus de l'avionique, du maritime et du tourisme.",
      image:
        "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=900&q=80",
      imageAlt: "Formateur en session de formation professionnelle",
    },
    {
      title: "Certifications reconnues",
      description: "Des parcours alignés sur les standards nationaux et internationaux.",
      image:
        "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=900&q=80",
      imageAlt: "Remise de diplôme et certifications",
    },
    {
      title: "Stages pratiques",
      description: "Une immersion terrain pour réussir votre insertion professionnelle.",
      image:
        "https://images.unsplash.com/photo-1556388158-158ea5ccacbd?auto=format&fit=crop&w=900&q=80",
      imageAlt: "Stage pratique en aéroport",
    },
  ],
  platformBenefits: [
    "Parcours guidés en ligne",
    "Modules & quizzes progressifs",
    "Attestation à la réussite",
  ],
  nav: [
    { label: "Accueil", href: "#home" },
    { label: "À propos", href: "#about" },
    { label: "Formations", href: "#expertise" },
    { label: "Pourquoi IAT", href: "#why" },
    { label: "Contact", href: "#contact" },
  ],
} as const;
