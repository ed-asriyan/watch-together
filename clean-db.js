import admin from 'firebase-admin';
import serviceAccount from './service-account-key.json';

const diff = process.argv[2];
const now = Math.round(new Date().getTime() / 1000);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env['VITE_FIREBASE_DATABASE_URL'],
});

const main = async function() {
    const root = admin.database().ref('room');
    const promises = [];
    let count = 0;

    process.stdout.write('Started...\n');
    (await root.once('value')).forEach(childSnapshot => {
        const task = (async function () {
            const updatedAt = childSnapshot.child('currentTime/updatedAt').val();
            if (typeof updatedAt !== 'number') {
                process.stdout.write(`room#${childSnapshot.key}\twrong type: ${typeof updatedAt}\n`);
            } else if (updatedAt < now - diff) {
                process.stdout.write(`room#${childSnapshot.key}\tupdated ${Math.round((now - updatedAt) / 60 / 60 / 24)} days ago\n`);
            } else if (updatedAt > now + diff) {
                process.stdout.write(`room#${childSnapshot.key}\tupdated ${Math.round((updatedAt - now) / 60 / 60 / 24)} days ahead (in future)\n`);
            } else {
                return;
            }
            await childSnapshot.ref.remove();
            ++count;
        })();
        promises.push(task);
    });

    await Promise.all(promises);
    process.stdout.write(`\nDone:\n- ${promises.length} rooms total\n- ${count} rooms deleted\n- ${promises.length - count} rooms left\n`);
};

main().catch(e => process.stderr.write(e.toString())).finally(() => process.exit(0));
