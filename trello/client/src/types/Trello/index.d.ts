declare global {
  interface Window {
    Trello: Trello;
  }
}

export interface Trello {
    setToken(token: string): void;
    put(path: string, params: any): Promise<any>;
}
