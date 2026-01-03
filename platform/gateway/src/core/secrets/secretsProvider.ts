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

export class AzureKeyVaultSecretsProvider implements SecretsProvider {
  private vaultUrl: string;
  private token?: string;

  constructor(vaultUrl: string, token?: string) {
    this.vaultUrl = vaultUrl.replace(/\/+$/, "");
    this.token = token;
  }

  private async getToken(): Promise<string> {
    if (this.token) return this.token;
    const resource = encodeURIComponent("https://vault.azure.net");
    const url = `http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=${resource}`;
    const response = await fetch(url, {
      headers: { Metadata: "true" }
    });
    if (!response.ok) {
      throw new Error(`MSI token fetch failed: ${response.status}`);
    }
    const data = (await response.json()) as { access_token?: string };
    if (!data.access_token) throw new Error("MSI token missing access_token");
    this.token = data.access_token;
    return data.access_token;
  }

  async ensureToken(): Promise<void> {
    await this.getToken();
  }

  private async fetchSecret(name: string): Promise<string> {
    const token = await this.getToken();
    const url = `${this.vaultUrl}/secrets/${encodeURIComponent(name)}?api-version=7.4`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) {
      throw new Error(`Key Vault secret fetch failed: ${response.status}`);
    }
    const data = (await response.json()) as { value?: string };
    if (!data.value) throw new Error("Key Vault secret missing value");
    return data.value;
  }

  async get(name: string): Promise<Secret> {
    const value = await this.fetchSecret(name);
    return { name, value };
  }

  async getKeyRef(name: string): Promise<KeyReference> {
    const value = await this.fetchSecret(name);
    return { keyRef: name, keyMaterial: value };
  }
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

export const getSecretsProvider = (): SecretsProvider => {
  const provider = (process.env.SECRETS_PROVIDER ?? "").toLowerCase();
  if (provider === "azure_key_vault") {
    const vaultUrl = process.env.AZURE_KEY_VAULT_URL;
    const token = process.env.AZURE_KEY_VAULT_TOKEN;
    if (!vaultUrl) {
      throw new Error("Azure Key Vault not configured");
    }
    return new AzureKeyVaultSecretsProvider(vaultUrl, token);
  }
  return new LocalEnvSecretsProvider();
};
