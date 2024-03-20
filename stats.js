import admin from 'firebase-admin';
import serviceAccount from './service-account-key.json' assert { type: "json" };
import firebaseConfig from './src/stores/firebase/firebase-config.json' assert { type: "json" };
import { isExample } from './src/stores/video-example.js';

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: firebaseConfig.databaseURL
});

const main = async function() {
    const root = admin.database().ref('room');
    const promises = [];

    process.stdout.write('roomId\turl\tisExample\tcurrentTime\tpaused\tisLocalMode\tminutesWatched\tupdatedAt\tcreatedAt\n');
    (await root.once('value')).forEach(childSnapshot => {
        const task = (async function () {
            const room = childSnapshot.val();
            process.stdout.write(`${childSnapshot.key}\t${room.url}\t${isExample(room.url)}\t${room.currentTime}\t${room.paused}\t${room.isLocalMode}\t${room.minutesWatched}\t${room.updatedAt && new Date(room.updatedAt * 1000).toISOString()}\t${room.createdAt && new Date(room.createdAt * 1000).toISOString()}\n`)

        })();
        promises.push(task);
    });

    await Promise.all(promises);
};

main().catch(e => process.stderr.write(e.toString())).finally(() => process.exit(0));
