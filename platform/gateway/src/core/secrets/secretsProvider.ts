export interface Secret {
  name: string;
  value: string;
}

export interface KeyReference {
  keyRef: string;
  keyMaterial: string;
}

export interface SecretsProvider {
  get(name: string): Promise<Secret>;
  getKeyRef(name: string): Promise<KeyReference>;
}

export class LocalEnvSecretsProvider implements SecretsProvider {
  async get(name: string): Promise<Secret> {
    const value = process.env[name];
    if (!value) throw new Error("Secret not set");
    return { name, value };
  }

  async getKeyRef(name: string): Promise<KeyReference> {
    const value = process.env[name];
    if (!value) throw new Error("Key not set");
    return { keyRef: name, keyMaterial: value };
  }
}
