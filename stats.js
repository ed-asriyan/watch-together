import admin from 'firebase-admin';
import { ref, onValue, get } from 'firebase/database';
import serviceAccount from './service-account-key.json' assert { type: "json" };

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env['VITE_FIREBASE_DATABASE_URL'],
});

const printRow = function(...params) {
    process.stdout.write(params.join('\t'));
    process.stdout.write('\n');
}

const main = async function() {
    const root = admin.database().ref('room');

    printRow(
        'roomId',
        'url',
        'currentTime',
        'paused',
        'isLocalMode',
        'minutesWatched',
        'updatedAt',
        'createdAt',
    )
    const rooms = await get(root);
    for (const [roomId, room] of Object.entries(rooms.val())) {
        if (!room) continue;
        const minutesWatched = room.minutesWatched && typeof room.minutesWatched === 'object' && Object.values(room.minutesWatched).reduce((a, b) => a + b);
        printRow(
            roomId,
            room.url?.value,
            room.currentTime?.value,
            room.paused?.value,
            room.isLocalMode?.value,
            minutesWatched,
            room.currentTime?.updatedAt && new Date(room.currentTime?.updatedAt * 1000).toISOString(),
            room.createdAt && new Date(room.createdAt * 1000).toISOString()
        );
    }
};

main().catch(e => process.stderr.write(e.toString())).finally(() => process.exit(0));
