import admin from 'firebase-admin';
import serviceAccount from './service-account-key.json' assert { type: "json" };
import firebaseConfig from './src/stores/firebase/firebase-config.json' assert { type: "json" };

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: firebaseConfig.databaseURL
});

const main = async function() {
    const root = admin.database().ref('room');
    const promises = [];

    process.stdout.write('roomId\tname\turl\ttime\tpaused\tisLocalMode\tminutesWatched\ttimestamp\n');
    (await root.once('value')).forEach(childSnapshot => {
        const task = (async function () {
            const room = childSnapshot.val();
            process.stdout.write(`${childSnapshot.key}\t${room.name}\t${room.url}\t${room.time}\t${room.paused}\t${room.isLocalMode}\t${room.minutesWatched}\t${new Date(room.timestamp * 1000).toISOString()}\n`)
        })();
        promises.push(task);
    });

    await Promise.all(promises);
};

main().catch(e => process.stderr.write(e.toString())).finally(() => process.exit(0));
