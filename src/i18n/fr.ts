import type { TranslatedText } from './_';

const fr: TranslatedText = {
    locale: {
        flag: '🇫🇷',
        name: 'French | Français',
    },
    selectVideo: {
        title: 'Sélectionnez une vidéo',
        link: {
            title: 'Lien en ligne',
            insertExample: 'cliquez ici pour coller un exemple aléatoire',
            description: 'Insérez un lien vers une playlist {type}Dailymotion{/type}, {type}YouTube{/type}, {type}Vimeo{/type}, {type}HLS{/type}, {type}vidéo{/type} ou Fichier {type}audio{/type}. L\'entrée est synchronisée avec toutes les personnes présentes dans la pièce.',
            hintNotWorking: 'Si le film ne démarre pas, assurez-vous que le lien vidéo {u}direct{/u} est inséré.',
            hintEmpty: 'Vous ne savez pas comment obtenir un lien vidéo à partir d\'un site Web ?',
            hintInvalid: 'le lien vidéo n\'est pas valide',
            help: 'C\'est facile, {link}lire ici{/link}!'
        },
        file: {
            title: 'Depuis l\'ordinateur',
            description: 'Vous avez déjà tous téléchargé un film !? Bien joué! Tout le monde devrait sélectionner le même fichier vidéo.',
            selectAnother: 'Cliquez pour sélectionner un autre fichier vidéo',
            select: 'Cliquez pour sélectionner le fichier vidéo',
            hint: 'Vous ne savez pas comment télécharger une vidéo à partir d\'un site Web ?',
            help: 'C\'est simple, {link}regardez ici{/link}!',
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
    },
    poweredBy: 'Alimenté par',
    or: 'ou',
};

export default fr;
