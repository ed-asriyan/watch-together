import { initializeApp,  getApp} from 'firebase/app';
import { getDatabase } from 'firebase/database';
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyAaLHJrzUf7dEfOefuG1Q6rODGBlzMqz1I",
    authDomain: "movie-together-e5a84.firebaseapp.com",
    databaseURL: "https://movie-together-e5a84-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "movie-together-e5a84",
    storageBucket: "movie-together-e5a84.appspot.com",
    messagingSenderId: "369270072783",
    appId: "1:369270072783:web:431fbeaa1a21964a675eba",
    measurementId: "G-39LEN0SXX6"
  };

export const firebase = initializeApp(firebaseConfig);
export const database = getDatabase(firebase);
