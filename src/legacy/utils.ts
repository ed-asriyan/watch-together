export const randomStr = function (length: number): string {
    let result = '';
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
};

export const sleep = function(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const stringToColor = function (str: string) {
  const hash = [...str].reduce((hash, char) => char.charCodeAt(0) + ((hash << 5) - hash), 0);
  let colour = '#';
  for (let i = 0; i < 3; i++) {
      const value = 192 + (hash >> (i * 2)) & 0xff;
      colour += value.toString(16).padStart(2, '0');
  }
  return colour;
};

export const groupConsecutiveElements = function<T> (arr: T[], compareFn: (a: T, b: T) => boolean): T[][] {
  if (arr.length === 0) return [];

  const result = [];
  let currentGroup = [arr[0]];

  for (let i = 1; i < arr.length; i++) {
      if (compareFn(arr[i], arr[i - 1])) {
          currentGroup.push(arr[i]);
      } else {
          result.push(currentGroup);
          currentGroup = [arr[i]];
      }
  }
  
  result.push(currentGroup);

  return result;
}
