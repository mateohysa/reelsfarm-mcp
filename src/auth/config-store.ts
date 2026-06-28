import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { DEFAULT_MCP_SERVER_URL, DEFAULT_PROFILE } from '../constants.js';

export interface StoredProfile {
  serverUrl?: string;
  apiKey?: string;
  accessToken?: string;
  oauth?: {
    clientInformation?: unknown;
    tokens?: unknown;
    codeVerifier?: string;
    discoveryState?: unknown;
  };
}

export interface StoredConfig {
  currentProfile?: string;
  profiles?: Record<string, StoredProfile>;
}

export function getConfigDir(): string {
  return process.env.REELSFARM_CONFIG_DIR || join(homedir(), '.reelsfarm');
}

export function getConfigPath(): string {
  return join(getConfigDir(), 'config.json');
}

export function loadConfig(): StoredConfig {
  const path = getConfigPath();
  if (!existsSync(path)) return { currentProfile: DEFAULT_PROFILE, profiles: {} };
  const raw = readFileSync(path, 'utf8');
  return JSON.parse(raw) as StoredConfig;
}

export function saveConfig(config: StoredConfig): void {
  const path = getConfigPath();
  mkdirSync(getConfigDir(), { recursive: true, mode: 0o700 });
  writeFileSync(path, JSON.stringify(config, null, 2) + '\n', { mode: 0o600 });
  chmodSync(path, 0o600);
}

export function getProfileName(profile?: string): string {
  return profile || loadConfig().currentProfile || DEFAULT_PROFILE;
}

export function loadProfile(profile?: string): StoredProfile {
  const config = loadConfig();
  const profileName = profile || config.currentProfile || DEFAULT_PROFILE;
  return config.profiles?.[profileName] || {};
}

export function saveProfile(profileName: string, profile: StoredProfile): void {
  const config = loadConfig();
  const profiles = { ...(config.profiles || {}), [profileName]: profile };
  saveConfig({ ...config, currentProfile: profileName, profiles });
}

export function clearProfile(profileName: string): void {
  const config = loadConfig();
  const profiles = { ...(config.profiles || {}) };
  delete profiles[profileName];
  saveConfig({ ...config, currentProfile: DEFAULT_PROFILE, profiles });
}

export function resolveStoredServerUrl(profile?: string): string {
  return loadProfile(profile).serverUrl || DEFAULT_MCP_SERVER_URL;
}
