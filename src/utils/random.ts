const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const charactersLen = characters.length;
export function makeId(length: number): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLen));
  }
  return result;
}

export function choose<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
