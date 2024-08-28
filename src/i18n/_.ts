const def = {
    locale: {
        flag: '🇬🇧',
        name: 'English',
    },
    selectVideo: {
        title: 'Select a video source',
        link: {
            title: 'From Link:',
            insertExample: 'paste an example',
            description: 'Insert a link to {type}Dailymotion{/type}, {type}YouTube{/type}, {type}Vimeo{/type}, {type}HLS{/type} playlist, {type}video{/type} or {type}audio{/type} file. The input is synced with everyone in the room.',
            hintNotWorking: 'If the movie doesn\'t play, make sure the {u}direct{/u} video link is inserted.',
            hintEmpty: 'Don\'t know how to get a video link from a website?',
            hintInvalid: 'Video link is invalid',
            help: 'It\'s easy, {link}read here{/link}!'
        },
        file: {
            title: 'From File:',
            description: 'You downloaded a movie already!? Select a video file.',
            selectAnother: 'Click to select another video file',
            selectAnotherStream: 'Replace the stream with your local file',
            select: 'Click to select video file',
            hint: 'Don\'t know how to download a video from a website?',
            help: 'It\'s easy, {link}watch here{/link}!',
            streamingPending: 'Streaming pending...',
            streamingConfirmation: 'Do you want to stream this copy of the video to other members in the room or do you want to play it for yourself only?\n\nClick "Ok" to stream with others; click "Cancel" to play for yourself only',
            streamingFailed: 'Streaming failed',
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
        torrentNotSupported: 'Streaming is not supported in this browser since it doesn\'t support ServiceWorker. Please select a your local copy of the video',
        isHostActive: 'This is taking too long... Please select a local copy of the video, or check that the streamer is online and has not refreshed the page',
        analyzing: `Please wait... The link you provided is not a direct link, we are analyzing the web page and looking for a video player there`,
        chat: {
            inputPlaceholder: 'Type here...',
            inputReminder: 'Press "q" or "Q" to open chat input',
            message: {
                seeked: 'scrubbed to {time}',
                played: 'played from {time}',
                paused: 'paused at {time}',
                selectedLocalFile: 'selected and is playing a local video file',
            },
        },
        onlineUsers: 'Users online ({number}): {users}',
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
    downloadSpeed: 'Download: {speed}',
    uploadSpeed: 'Upload: {speed}',
    dontRefresh: 'You\'re seeding. Do not refresh the page or close the browser tab',
    peers: 'Peers: {peers}',
    feedback: {
        link: 'https://forms.gle/YY8ypRnJ5b65QWhc6',
        linkText: 'Experience issues? Have any ideas? Please provide your feedback {link}here{/link}', 
    },
};

export type TranslatedText = typeof def;

export default def;
