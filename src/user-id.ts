import { v4 as uuidv4 } from 'uuid';

let userId: string = localStorage.getItem('userId') as string;
if (!userId) {
    userId = uuidv4();
    localStorage.setItem('userId', userId);
}
export default userId;
