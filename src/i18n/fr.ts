import type { TranslatedText } from './_';

const fr: TranslatedText = {
    locale: {
        flag: '🇫🇷',
        name: 'French | Français',
    },
    selectVideo: {
        title: 'Sélectionnez une source vidéo',
        link: {
            title: 'Du lien:',
            insertExample: 'coller un exemple',
            description: 'Insérez un lien vers une playlist {type}YouTube{/type}, {type}Vimeo{/type}, {type}HLS{/type}, {type}vidéo{/type} ou Fichier {type}audio{/type}. L\'entrée est synchronisée avec toutes les personnes présentes dans la pièce.',
            hintNotWorking: 'Si le film ne démarre pas, assurez-vous que le lien vidéo {u}direct{/u} est inséré.',
            hintEmpty: 'Vous ne savez pas comment obtenir un lien vidéo à partir d\'un site Web ?',
            hintInvalid: 'le lien vidéo n\'est pas valide',
            help: 'C\'est facile, {link}lire ici{/link}!'
        },
        file: {
            title: 'Du dossier:',
            description: 'Vous avez déjà téléchargé un film ? Sélectionner un fichier vidéo',
            selectAnother: 'Cliquez pour sélectionner un autre fichier vidéo',
            select: 'Cliquez pour sélectionner le fichier vidéo',
            hint: 'Vous ne savez pas comment télécharger une vidéo à partir d\'un site Web ?',
            help: 'C\'est simple, {link}regardez ici{/link}!',
            selectAnotherStream: 'Remplacer le flux par votre fichier local',
            streamingPending: 'Streaming en attente...',
            streamingConfirmation: 'Voulez-vous diffuser cette copie de la vidéo aux autres membres de la salle ou voulez-vous la lire pour vous seul?\n\n Cliquez sur "Ok" pour diffuser la vidéo avec d\'autres membres ; cliquez sur "Cancel" pour la diffuser pour vous seul.',
            streamingFailed: 'Échec de la diffusion en continu'
        },
    },
    invite: {
        title: 'Inviter des personnes dans cette salle',
        description: 'Partagez le lien vers cette salle avec la personne avec qui vous souhaitez regarder un film',
        copyLink: 'Cliquez sur le lien pour le copier dans le presse-papiers',
        clickToShare: 'Cliquez pour partager le lien',
        clickToCopy: 'Cliquez pour copier le lien',
        linkHasBeenCopied: 'Le lien est copié dans le presse-papier',
        clickToShareHint: 'Cliquez sur le lien pour partager. Ou {link}cliquez ici{/link} pour le copier dans le presse-papiers',
        joinPromt: 'Collez le lien vers la salle que vous souhaitez rejoindre ou entrez l\'ID de la salle:',
    },
    room: {
        generateNewRoom: {
            button: 'Générer une nouvelle salle',
            confirmation: 'Vous déménagerez dans une nouvelle pièce vide, et la configuration actuelle restera dans la pièce actuelle et ne sera pas copiée dans la nouvelle.\n\nÊtes-vous sûr de vouloir continuer?'
        },
        joinAnotherRoom: 'Rejoindre une autre salle',
    },
    player: {
        placeholder: 'Le lecteur vidéo apparaîtra ici lorsque vous insérez un lien ou sélectionnez un fichier',
        torrentNotSupported: 'La diffusion en continu n\'est pas prise en charge par ce navigateur car il ne prend pas en charge ServiceWorker. Veuillez sélectionner une copie locale de la vidéo',
        isHostActive: 'Cela prend trop de temps... Veuillez sélectionner votre copie locale de la vidéo ou vérifier si le diffuseur est en ligne et n\'a pas actualisé la page',
        analyzing: `Veuillez patienter... Le lien que vous avez fourni n'est pas un lien direct, nous analysons la page web et y recherchons un lecteur vidéo.`,
        chat: {
            inputPlaceholder: 'Tapez ici...',
            inputReminder: 'Appuyez sur "q" ou "Q" pour ouvrir le chat',
            message: {
                seeked: 'avancé à {time}',
                played: 'regarder depuis {time}',
                paused: 'pause au {time}',
                selectedLocalFile: 'a sélectionné et lit un fichier vidéo local',
            },
        },
        onlineUsers: 'Spectateurs en lignes ({number}): {users}',
    },
    poweredBy: 'Alimenté par',
    or: 'ou',
    you: 'vous',
    users: {
        nameEdit: 'Cliquez pour changer de nom',
        nameEditPromt: 'Entrez votre nom (maximum {maxLength} caractères) ou laissez le champ vide pour choisir un nom au hasard',
        online: 'en ligne',
    },
    error: {
        description: 'Une erreur s\'est produite',
        reload: 'Recharger l\'application',
    },
    noInternet: 'Pas de connexion internet',
    downloadSpeed: 'Téléchargement: {speed}',
    uploadSpeed: 'Téléversement: {speed}',
    dontRefresh: 'Je partage le fichier. Ne pas rafraîchir la page ou fermer l\'onglet du navigateur',
    peers: 'Peers: {peers}',
    fullscreen: 'plein écran',
    scrollUp: 'faire défiler vers le haut',
    termsAndConditions: `Conditions générales d'utilisation`,
    privacyPolicy: `Politique de confidentialité`,
    termsAndConditionsReminder: `En utilisant ce site web, vous acceptez les {termsAndConditions}Terms and Conditions{/termsAndConditions}, et {privacyPolicy}Privacy Policy{/privacyPolicy}`,
    feedback: {
        link: 'https://forms.gle/YY8ypRnJ5b65QWhc6',
        linkText: 'Vous rencontrez des problèmes? Vous avez des idées? Veuillez nous faire part de vos commentaires {link}ici (anglais){/link}', 
    },
};

export default fr;
