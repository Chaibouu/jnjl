import { PrismaClient } from "@prisma/client";

/**
 * Banque de questions du module QCM : catégories + questions (avec réponses et explications).
 * Idempotent : peut être relancé sans créer de doublons (catégorie identifiée par son nom,
 * question par son texte dans la catégorie).
 *
 *   npm run seed:qcm
 */

const prisma = new PrismaClient();

type Option = { text: string; isCorrect: boolean };
type SeedQuestion = {
  type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE";
  text: string;
  explanation: string;
  points: number;
  options: Option[];
};
type SeedCategory = { name: string; description: string; questions: SeedQuestion[] };

/** Choix unique : `correct` = index de la bonne réponse. */
function single(text: string, options: string[], correct: number, explanation: string, points = 1): SeedQuestion {
  return {
    type: "SINGLE_CHOICE",
    text,
    explanation,
    points,
    options: options.map((option, index) => ({ text: option, isCorrect: index === correct })),
  };
}

/** Choix multiple : `correct` = indices des bonnes réponses. */
function multi(text: string, options: string[], correct: number[], explanation: string, points = 2): SeedQuestion {
  return {
    type: "MULTIPLE_CHOICE",
    text,
    explanation,
    points,
    options: options.map((option, index) => ({ text: option, isCorrect: correct.includes(index) })),
  };
}

/** Vrai / Faux. */
function trueFalse(text: string, isTrue: boolean, explanation: string, points = 1): SeedQuestion {
  return {
    type: "TRUE_FALSE",
    text,
    explanation,
    points,
    options: [
      { text: "Vrai", isCorrect: isTrue },
      { text: "Faux", isCorrect: !isTrue },
    ],
  };
}

const CATEGORIES: SeedCategory[] = [
  {
    name: "Leadership",
    description: "Qualités du leader, prise de décision, délégation et intelligence émotionnelle.",
    questions: [
      single(
        "Parmi ces qualités, laquelle est la plus essentielle pour un leader ?",
        ["L'autoritarisme", "L'écoute et l'exemplarité", "La rapidité à parler", "Le goût du pouvoir"],
        1,
        "Un leader inspire par l'exemple et sait écouter son équipe : c'est la base de la confiance."
      ),
      trueFalse(
        "Un bon leader doit toujours décider seul, sans consulter personne.",
        false,
        "Un leader consulte, écoute les avis et décide ensuite : la participation renforce l'adhésion de l'équipe."
      ),
      multi(
        "Quelles sont des qualités d'un bon leader ? (plusieurs réponses)",
        ["L'intégrité", "La vision", "L'arrogance", "Le sens de l'écoute"],
        [0, 1, 3],
        "Intégrité, vision et écoute font le leadership ; l'arrogance l'affaiblit."
      ),
      single(
        "Que signifie « déléguer » une tâche ?",
        [
          "La confier à un membre de l'équipe en lui donnant les moyens et l'autorité nécessaires",
          "S'en débarrasser sans suivi",
          "La faire soi-même plus vite",
          "La reporter à plus tard",
        ],
        0,
        "Déléguer, c'est faire confiance : on confie la tâche, les moyens et la responsabilité, tout en gardant un suivi."
      ),
      single(
        "Qu'est-ce que l'intelligence émotionnelle ?",
        [
          "La capacité à mémoriser beaucoup d'informations",
          "La capacité à comprendre et gérer ses émotions et celles des autres",
          "La capacité à cacher ses sentiments",
          "La capacité à convaincre à tout prix",
        ],
        1,
        "Elle regroupe la conscience de soi, la maîtrise de ses émotions et l'empathie envers les autres."
      ),
      single(
        "Un membre de votre équipe commet une erreur. Quelle est la meilleure réaction d'un leader ?",
        [
          "Le critiquer devant tout le monde",
          "Ignorer l'erreur",
          "Lui parler en privé, comprendre la cause et l'aider à progresser",
          "Le remplacer immédiatement",
        ],
        2,
        "Un feedback constructif, donné en privé, permet d'apprendre de l'erreur sans humilier.",
        2
      ),
      trueFalse(
        "Le leadership s'apprend et se développe avec la pratique.",
        true,
        "Si certaines dispositions sont naturelles, le leadership se travaille : formation, expérience et retours."
      ),
      single(
        "Que désigne la « vision » d'un leader ?",
        [
          "Sa capacité à voir de loin",
          "L'image claire de l'avenir qu'il veut construire avec son équipe",
          "Son emploi du temps",
          "Le règlement intérieur",
        ],
        1,
        "La vision donne un cap commun : elle explique où l'on va et pourquoi."
      ),
      multi(
        "Quels comportements renforcent la confiance au sein d'une équipe ?",
        ["Tenir ses engagements", "Reconnaître ses propres erreurs", "Promettre sans jamais tenir", "Communiquer avec transparence"],
        [0, 1, 3],
        "La confiance se construit par la cohérence, l'honnêteté et la transparence."
      ),
      single(
        "Selon la matrice d'Eisenhower, comment traiter une tâche importante mais non urgente ?",
        ["La supprimer", "La planifier", "La déléguer sans suivi", "L'ignorer"],
        1,
        "Les tâches importantes non urgentes (formation, prévention, relations) se planifient pour éviter qu'elles ne deviennent urgentes.",
        2
      ),
    ],
  },
  {
    name: "Citoyenneté et engagement civique",
    description: "Droits et devoirs du citoyen, vie collective, bien public, lutte contre la corruption.",
    questions: [
      single(
        "Lequel de ces éléments est un devoir du citoyen ?",
        ["Ignorer les lois qui ne l'arrangent pas", "Respecter les lois et les biens publics", "Ne s'occuper que de soi", "Refuser toute contribution"],
        1,
        "Respecter les lois et préserver les biens publics est un devoir civique de base."
      ),
      trueFalse(
        "Le bien public appartient à tous, il est donc de la responsabilité de chacun de le protéger.",
        true,
        "Écoles, routes, marchés ou puits sont financés pour tous : les dégrader nuit à toute la communauté."
      ),
      multi(
        "Quelles actions relèvent de l'engagement citoyen ?",
        ["Participer à une opération de salubrité", "S'informer avant de voter", "Jeter ses déchets dans la rue", "S'investir dans une association locale"],
        [0, 1, 3],
        "S'engager, c'est agir pour le bien commun, à son échelle."
      ),
      single(
        "Qu'est-ce que la corruption ?",
        [
          "Un moyen normal d'accélérer une démarche",
          "L'abus d'une position ou d'un pouvoir pour obtenir un avantage indu",
          "Un cadeau d'anniversaire",
          "Une forme de solidarité",
        ],
        1,
        "La corruption détourne l'intérêt général au profit d'intérêts privés ; elle freine le développement."
      ),
      single(
        "Que garantit le droit de vote ?",
        [
          "La possibilité de choisir ses représentants",
          "L'obligation de soutenir le pouvoir en place",
          "Un revenu mensuel",
          "L'exemption d'impôts",
        ],
        0,
        "Voter permet à chaque citoyen de participer au choix de ses représentants."
      ),
      trueFalse(
        "Payer ses impôts et taxes contribue au financement des services publics (écoles, santé, routes).",
        true,
        "Les impôts financent les services dont bénéficie toute la population."
      ),
      single(
        "Que permet le dialogue intercommunautaire ?",
        [
          "D'éviter toute discussion",
          "De renforcer la cohésion sociale et de prévenir les conflits",
          "De diviser les groupes",
          "De remplacer la justice",
        ],
        1,
        "Le dialogue entre communautés crée de la confiance et aide à résoudre pacifiquement les différends."
      ),
      single(
        "Qu'est-ce que le bénévolat ?",
        [
          "Un travail rémunéré à temps plein",
          "Une activité librement choisie, au service des autres, sans rémunération",
          "Une obligation légale",
          "Une activité réservée aux fonctionnaires",
        ],
        1,
        "Le bénévole donne de son temps et de ses compétences librement, sans contrepartie financière."
      ),
      trueFalse(
        "La liberté d'un citoyen s'arrête là où commence celle des autres.",
        true,
        "Vivre ensemble suppose de respecter les droits d'autrui : chacun est libre dans le respect de la loi et des autres.",
        2
      ),
      single(
        "Face à un fait d'injustice dans votre quartier, quelle attitude est la plus citoyenne ?",
        [
          "Se moquer",
          "Le signaler aux autorités compétentes ou aux structures adaptées",
          "Se faire justice soi-même",
          "Ne rien dire par peur",
        ],
        1,
        "Le citoyen agit dans le cadre de la loi : il signale et s'appuie sur les institutions et les structures adaptées.",
        2
      ),
    ],
  },
  {
    name: "Culture générale du Niger",
    description: "Repères sur le Niger : géographie, symboles, histoire et institutions.",
    questions: [
      single("Quelle est la capitale du Niger ?", ["Zinder", "Maradi", "Niamey", "Agadez"], 2, "Niamey, située sur le fleuve Niger, est la capitale du pays."),
      single(
        "Quelle est la langue officielle du Niger ?",
        ["L'anglais", "Le français", "L'arabe", "Le haoussa"],
        1,
        "Le français est la langue officielle ; le pays compte aussi de nombreuses langues nationales (haoussa, zarma-songhay, tamasheq, kanouri, fulfulde…)."
      ),
      single(
        "Quand le Niger a-t-il accédé à l'indépendance ?",
        ["Le 1er janvier 1960", "Le 3 août 1960", "Le 4 avril 1960", "Le 18 décembre 1960"],
        1,
        "Le Niger est devenu indépendant le 3 août 1960, date de sa fête nationale d'indépendance.",
        2
      ),
      single(
        "Quelles sont les couleurs du drapeau du Niger ?",
        ["Rouge, jaune, vert", "Orange, blanc, vert", "Bleu, blanc, rouge", "Noir, blanc, vert"],
        1,
        "Le drapeau est composé de trois bandes horizontales orange, blanche et verte, avec un disque orange au centre de la bande blanche."
      ),
      single(
        "Quelle est la devise du Niger ?",
        ["Union, Discipline, Travail", "Fraternité, Travail, Progrès", "Unité, Paix, Justice", "Liberté, Égalité, Fraternité"],
        1,
        "La devise du Niger est « Fraternité, Travail, Progrès »."
      ),
      single("Comment s'appelle l'hymne national du Niger ?", ["La Nigérienne", "La Marseillaise", "Le Sahélien", "L'Africaine"], 0, "L'hymne national du Niger s'intitule « La Nigérienne »."),
      single(
        "Quelle est la monnaie utilisée au Niger ?",
        ["Le naira", "Le franc CFA (XOF)", "Le dinar", "Le cedi"],
        1,
        "Le Niger utilise le franc CFA de l'Afrique de l'Ouest (XOF), émis par la BCEAO."
      ),
      single(
        "Quel grand fleuve traverse le sud-ouest du Niger et la capitale ?",
        ["Le Nil", "Le Congo", "Le fleuve Niger", "Le Sénégal"],
        2,
        "Le fleuve Niger traverse le pays d'ouest en sud-est et passe à Niamey."
      ),
      multi(
        "Lesquelles de ces villes sont des chefs-lieux de région du Niger ?",
        ["Zinder", "Maradi", "Bamako", "Tahoua"],
        [0, 1, 3],
        "Zinder, Maradi et Tahoua sont des chefs-lieux de région ; Bamako est la capitale du Mali."
      ),
      trueFalse(
        "Le Niger est le plus vaste pays d'Afrique de l'Ouest par sa superficie.",
        true,
        "Avec environ 1,27 million de km², le Niger est le plus grand pays d'Afrique de l'Ouest.",
        2
      ),
    ],
  },
  {
    name: "Entrepreneuriat et emploi des jeunes",
    description: "Création d'activité, notions de gestion, financement et insertion professionnelle.",
    questions: [
      single(
        "Qu'est-ce qu'un entrepreneur ?",
        [
          "Une personne qui identifie une opportunité et crée une activité pour y répondre",
          "Un salarié de l'État",
          "Un client fidèle",
          "Un banquier",
        ],
        0,
        "L'entrepreneur repère un besoin, mobilise des ressources et prend des risques pour créer de la valeur."
      ),
      single(
        "Que présente un business plan ?",
        [
          "La liste des employés",
          "Le projet d'entreprise : marché, stratégie, moyens et prévisions financières",
          "Le règlement d'un concours",
          "Le contrat de travail",
        ],
        1,
        "Le business plan démontre la viabilité du projet et sert à convaincre partenaires et financeurs."
      ),
      single(
        "Comment calcule-t-on un bénéfice ?",
        ["Chiffre d'affaires − charges", "Chiffre d'affaires + charges", "Charges − chiffre d'affaires", "Épargne × 2"],
        0,
        "Le bénéfice est la différence entre ce que l'entreprise gagne (chiffre d'affaires) et ce qu'elle dépense (charges).",
        2
      ),
      trueFalse(
        "Étudier son marché (clients, concurrents, besoins) avant de se lancer réduit les risques d'échec.",
        true,
        "L'étude de marché permet d'ajuster l'offre et le prix aux besoins réels des clients."
      ),
      multi(
        "Quelles sont des sources possibles de financement d'un petit projet ?",
        ["L'épargne personnelle", "La microfinance", "Les tontines et l'épargne solidaire", "Ne rien investir du tout"],
        [0, 1, 2],
        "Épargne, microfinance et tontines sont des moyens courants de financer un projet à petite échelle."
      ),
      single(
        "Qu'appelle-t-on « client cible » ?",
        [
          "Tous les habitants d'un pays",
          "Le groupe de personnes précis auquel l'offre s'adresse",
          "Un concurrent direct",
          "Un fournisseur",
        ],
        1,
        "Bien définir sa cible permet d'adapter le produit, le prix et la communication."
      ),
      trueFalse(
        "Un entrepreneur prend des risques calculés plutôt que de laisser tout au hasard.",
        true,
        "Prendre des risques calculés, c'est les évaluer, les limiter et se préparer à les gérer."
      ),
      single(
        "Pourquoi séparer l'argent personnel de l'argent de l'entreprise ?",
        [
          "Ce n'est pas utile",
          "Pour suivre correctement les comptes et mesurer la rentabilité de l'activité",
          "Pour payer moins d'impôts illégalement",
          "Pour compliquer la gestion",
        ],
        1,
        "Mélanger les fonds empêche de savoir si l'activité est réellement rentable.",
        2
      ),
    ],
  },
  {
    name: "Communication et travail en équipe",
    description: "Écoute active, prise de parole, feedback, gestion des conflits et dynamique d'équipe.",
    questions: [
      single(
        "Qu'est-ce que l'écoute active ?",
        [
          "Attendre son tour pour parler",
          "Porter toute son attention à l'interlocuteur et reformuler pour vérifier sa compréhension",
          "Interrompre pour donner son avis",
          "Regarder son téléphone en écoutant",
        ],
        1,
        "L'écoute active combine attention, questions et reformulation."
      ),
      trueFalse(
        "La communication non verbale (gestes, regard, posture) influence la perception d'un message.",
        true,
        "Le ton, le regard et la posture peuvent renforcer ou contredire ce que l'on dit."
      ),
      multi(
        "Quels éléments rendent un message clair ?",
        ["Des phrases simples", "Un objectif précis", "Des termes vagues et techniques", "Des exemples concrets"],
        [0, 1, 3],
        "Un message efficace est simple, précis et illustré."
      ),
      single(
        "Vous devez prendre la parole devant un public. Quelle est la meilleure préparation ?",
        [
          "Improviser totalement",
          "Structurer son propos, connaître son public et s'entraîner",
          "Lire son texte sans lever les yeux",
          "Parler le plus vite possible",
        ],
        1,
        "Un discours structuré, adapté au public et répété gagne en clarté et en confiance.",
        2
      ),
      single(
        "Deux membres de l'équipe sont en désaccord. Que faire en premier ?",
        [
          "Choisir un camp",
          "Écouter chacun, comprendre les points de vue et chercher un terrain d'entente",
          "Ignorer le conflit",
          "Sanctionner les deux",
        ],
        1,
        "La médiation commence par l'écoute de chaque partie."
      ),
      single(
        "Que signifie « feedback constructif » ?",
        [
          "Une critique blessante",
          "Un retour précis, respectueux et orienté vers l'amélioration",
          "Un compliment sans contenu",
          "Un silence poli",
        ],
        1,
        "Le feedback constructif décrit des faits, explique leur effet et propose des pistes d'amélioration."
      ),
      trueFalse(
        "Une réunion est plus efficace lorsqu'elle a un objectif clair et un ordre du jour.",
        true,
        "Un objectif et un ordre du jour évitent les digressions et font gagner du temps."
      ),
      single(
        "Quel est le principal avantage du travail en équipe ?",
        [
          "Chacun travaille sans lien avec les autres",
          "La mise en commun des compétences permet d'atteindre de meilleurs résultats",
          "Il n'y a plus besoin d'organisation",
          "Il supprime les désaccords",
        ],
        1,
        "La complémentarité des compétences et des points de vue renforce la qualité du résultat."
      ),
    ],
  },
  {
    name: "Gestion de projet",
    description: "Étapes d'un projet, planification, objectifs SMART, budget et gestion des risques.",
    questions: [
      single(
        "Que signifie l'acronyme SMART pour un objectif ?",
        [
          "Simple, Moderne, Amusant, Rapide, Technique",
          "Spécifique, Mesurable, Atteignable, Réaliste, défini dans le Temps",
          "Solide, Multiple, Adapté, Rentable, Total",
          "Sûr, Motivant, Actuel, Réel, Tendance",
        ],
        1,
        "Un objectif SMART est Spécifique, Mesurable, Atteignable, Réaliste et Temporellement défini.",
        2
      ),
      single(
        "Quel est l'ordre logique des grandes phases d'un projet ?",
        [
          "Exécution, initialisation, clôture, planification",
          "Initialisation, planification, exécution et suivi, clôture",
          "Clôture, exécution, planification",
          "Planification, clôture, initialisation",
        ],
        1,
        "On lance le projet, on le planifie, on l'exécute en le suivant, puis on le clôture et on en tire les leçons."
      ),
      trueFalse(
        "Identifier les risques dès la préparation permet de mieux les anticiper.",
        true,
        "Une analyse des risques prévoit des solutions avant que les problèmes ne surviennent."
      ),
      single(
        "À quoi sert un diagramme de Gantt ?",
        [
          "À dessiner le logo du projet",
          "À planifier les tâches dans le temps et visualiser leur enchaînement",
          "À calculer les salaires",
          "À archiver les documents",
        ],
        1,
        "Le diagramme de Gantt représente les tâches sur une échelle de temps."
      ),
      single(
        "Qu'est-ce qu'une « partie prenante » d'un projet ?",
        [
          "Uniquement le chef de projet",
          "Toute personne ou organisation concernée ou affectée par le projet",
          "Un outil informatique",
          "Un concurrent",
        ],
        1,
        "Bénéficiaires, partenaires, financeurs, équipe : les parties prenantes doivent être identifiées et associées."
      ),
      multi(
        "Que contient généralement le budget d'un projet ?",
        ["Les dépenses prévues", "Les sources de financement", "La couleur des locaux", "Un suivi des écarts"],
        [0, 1, 3],
        "Le budget liste dépenses et financements, et permet de suivre les écarts entre prévu et réalisé."
      ),
      single(
        "Qu'appelle-t-on « livrable » ?",
        [
          "Un retard de livraison",
          "Un résultat concret et vérifiable produit par le projet",
          "Un membre de l'équipe",
          "Une réunion",
        ],
        1,
        "Un livrable est un produit, un document ou un service que le projet doit fournir."
      ),
      single(
        "À quoi sert un indicateur de suivi ?",
        [
          "À décorer un rapport",
          "À mesurer l'avancement et les résultats par rapport aux objectifs",
          "À remplacer le budget",
          "À désigner le responsable",
        ],
        1,
        "Un indicateur (chiffré si possible) permet de savoir si l'on avance comme prévu.",
        2
      ),
    ],
  },
  {
    name: "Environnement et développement durable",
    description: "Enjeux climatiques au Sahel, préservation des ressources et Objectifs de développement durable.",
    questions: [
      single(
        "Qu'est-ce que la désertification ?",
        [
          "La création de nouvelles forêts",
          "La dégradation de terres fertiles en zones arides",
          "L'installation de villes dans le désert",
          "La construction de puits",
        ],
        1,
        "La désertification résulte du climat et des activités humaines (coupe excessive, surpâturage…) : c'est un défi majeur au Sahel."
      ),
      single(
        "Que vise l'initiative de la « Grande Muraille Verte » ?",
        [
          "Construire un mur de protection militaire",
          "Restaurer les terres et lutter contre la désertification dans la bande sahélienne",
          "Créer un parc d'attractions",
          "Relier deux fleuves",
        ],
        1,
        "Lancée par l'Union africaine, elle vise à restaurer les terres dégradées à travers le Sahel."
      ),
      single(
        "Que sont les Objectifs de développement durable (ODD) ?",
        [
          "17 objectifs mondiaux adoptés par les Nations unies pour l'horizon 2030",
          "Un règlement scolaire",
          "Une monnaie internationale",
          "Un traité militaire",
        ],
        0,
        "Adoptés en 2015 dans l'Agenda 2030, les 17 ODD couvrent pauvreté, éducation, climat, égalité, etc.",
        2
      ),
      multi(
        "Quels gestes protègent l'environnement au quotidien ?",
        ["Planter des arbres", "Trier et réduire ses déchets", "Gaspiller l'eau", "Utiliser l'énergie solaire quand c'est possible"],
        [0, 1, 3],
        "Reboiser, réduire les déchets et privilégier les énergies renouvelables sont des gestes simples et efficaces."
      ),
      trueFalse(
        "Le changement climatique affecte l'agriculture et l'accès à l'eau dans les zones sahéliennes.",
        true,
        "Sécheresses et pluies irrégulières fragilisent les récoltes et les ressources en eau."
      ),
      single(
        "Quelle énergie est renouvelable ?",
        ["Le charbon", "Le pétrole", "L'énergie solaire", "Le gaz naturel"],
        2,
        "Le soleil est une source inépuisable à l'échelle humaine ; c'est particulièrement adapté au Sahel."
      ),
      trueFalse(
        "Abandonner ses déchets dans la nature n'a aucune conséquence sur la santé ni sur l'environnement.",
        false,
        "Les déchets polluent l'eau et les sols, attirent des nuisibles et favorisent des maladies."
      ),
      single(
        "Pourquoi économiser l'eau est-il particulièrement important au Sahel ?",
        [
          "Parce que l'eau y est abondante",
          "Parce que l'eau est une ressource rare et précieuse",
          "Parce qu'il pleut toute l'année",
          "Ce n'est pas important",
        ],
        1,
        "Dans un climat aride, chaque goutte compte pour la santé, l'agriculture et l'élevage."
      ),
    ],
  },
];

/** Mêmes règles que schemas/question.ts — vérifiées avant toute écriture. */
function validate(category: string, question: SeedQuestion) {
  const correct = question.options.filter(option => option.isCorrect).length;
  const problems: string[] = [];
  if (question.text.trim().length < 5) problems.push("texte trop court");
  if (question.options.length < 2) problems.push("moins de 2 réponses");
  if (question.options.some(option => !option.text.trim() || option.text.length > 300)) problems.push("réponse vide ou trop longue");
  if (correct === 0) problems.push("aucune bonne réponse");
  if (question.type !== "MULTIPLE_CHOICE" && correct > 1) problems.push("plusieurs bonnes réponses pour un choix unique");
  if (question.type === "TRUE_FALSE" && question.options.length !== 2) problems.push("Vrai/Faux : 2 réponses exactement");
  if ((question.explanation ?? "").length > 1000) problems.push("explication trop longue");
  if (problems.length > 0) {
    throw new Error(`[${category}] « ${question.text.slice(0, 60)} » : ${problems.join(", ")}`);
  }
}

async function main() {
  // Contrôle complet avant d'écrire quoi que ce soit.
  for (const category of CATEGORIES) {
    for (const question of category.questions) validate(category.name, question);
  }

  let categoriesCreated = 0;
  let questionsCreated = 0;
  let questionsSkipped = 0;

  for (const category of CATEGORIES) {
    const existing = await prisma.questionCategory.findUnique({ where: { name: category.name } });
    const saved = existing
      ? await prisma.questionCategory.update({
          where: { id: existing.id },
          data: { isDeleted: false, description: existing.description ?? category.description },
        })
      : await prisma.questionCategory.create({
          data: { name: category.name, description: category.description },
        });
    if (!existing) categoriesCreated += 1;

    for (const question of category.questions) {
      const duplicate = await prisma.question.findFirst({
        where: { categoryId: saved.id, text: question.text, isDeleted: false },
        select: { id: true },
      });
      if (duplicate) {
        questionsSkipped += 1;
        continue;
      }

      await prisma.question.create({
        data: {
          categoryId: saved.id,
          type: question.type,
          text: question.text,
          explanation: question.explanation,
          points: question.points,
          isActive: true,
          options: {
            create: question.options.map((option, index) => ({
              text: option.text,
              isCorrect: option.isCorrect,
              position: index,
            })),
          },
        },
      });
      questionsCreated += 1;
    }
  }

  console.log(
    `Banque de questions : ${categoriesCreated} catégorie(s) créée(s), ${questionsCreated} question(s) créée(s), ${questionsSkipped} déjà présente(s).`
  );
}

main()
  .catch(error => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
