import { initializeApp,  getApp} from 'firebase/app';
import { getDatabase } from 'firebase/database';
import firebaseConfig from './firebase-config.json';

export const firebase = initializeApp(firebaseConfig);
export const database = getDatabase(firebase);
