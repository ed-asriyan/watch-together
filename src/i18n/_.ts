const def = {
    locale: {
        flag: '🇬🇧',
        name: 'English',
    },
    selectVideo: {
        title: 'Select a video',
        link: {
            title: 'Online link',
            insertExample: 'click here to paste random example',
            description: 'Insert a link to {type}Dailymotion{/type}, {type}YouTube{/type}, {type}Vimeo{/type}, {type}HLS{/type} playlist, {type}video{/type} or {type}audio{/type} file. The input is synced with everyone in the room.',
            hintNotWorking: 'If the movie doesn\'t play, make sure the {u}direct{/u} video link is inserted.',
            hintEmpty: 'Don\'t know how to get a video link from a website?',
            hintInvalid: 'Video link is invalid',
            help: 'It\'s easy, {link}read here{/link}!'
        },
        file: {
            title: 'From computer',
            description: 'You all downloaded a movie already!? Well done! Everyone should select the same video file.',
            selectAnother: 'Click to select another video file',
            select: 'Click to select video file',
            hint: 'Don\'t know how to download a video from a website?',
            help: 'It\'s easy, {link}watch here{/link}!',
        },
    },
    invite: {
        title: 'Invite people to this room',
        description: 'Share the link to this room with who you want to watch a movie with',
        copyLink: 'Click the link to copy it to the clipboard',
        clickToShare: 'Click to share the link',
        clickToCopy: 'Click to copy the link',
        linkHasBeenCopied: 'The link is copied to the clipboard',
        clickToShareHint: 'Click the link to share. Or {link}click here{/link} to copy it to the clipboard',
        joinPromt: 'Paste the link to the room you want to join or enter the room ID:',
    },
    room: {
        generateNewRoom: {
            button: 'Generate a new room',
            confirmation: 'You\'ll move to a new empty room, and the current configuration will remain in the current room and will not be copied to the new one.\n\nAre you sure you want to proceed?'
        },
        joinAnotherRoom: 'Join another room',
    },
    player: {
        placeholder: 'Video player will appear here when you insert a link or select file',
    },
    poweredBy: 'Powered by',
    or: 'or',
    you: 'you',
    users: {
        nameEdit: 'Click to change nickname',
        nameEditPromt: 'Enter your name (maximum {maxLength} characters) or leave the input blank to pick random name',
        online: 'online',
    },
    error: {
        description: 'Error occurred',
        reload: 'Reload the app',
    },
    noInternet: 'No internet connection',
};

export type TranslatedText = typeof def;

export default def;
