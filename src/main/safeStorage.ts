import { safeStorage } from 'electron'
import fs from 'fs'
import path from 'path'
import { app } from 'electron'

const SETTINGS_DIR = () => path.join(app.getPath('userData'), 'secure_config')
const KEY_FILE = () => path.join(SETTINGS_DIR(), 'gemini_key.bin')

/**
 * Encrypts and persists the Gemini API key using Electron safeStorage (DPAPI on Windows).
 */
export function storeEncryptedApiKey(key: string): void {
  const dir = SETTINGS_DIR()
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(key)
    fs.writeFileSync(KEY_FILE(), encrypted)
  } else {
    // Fallback if encryption is unavailable on OS
    const fallbackBuffer = Buffer.from(key, 'utf-8').toString('base64')
    fs.writeFileSync(KEY_FILE(), fallbackBuffer, 'utf-8')
  }
}

/**
 * Decrypts and retrieves the stored Gemini API key.
 */
export function getStoredApiKey(): string {
  const file = KEY_FILE()
  if (!fs.existsSync(file)) return ''

  try {
    if (safeStorage.isEncryptionAvailable()) {
      const buffer = fs.readFileSync(file)
      return safeStorage.decryptString(buffer)
    } else {
      const b64 = fs.readFileSync(file, 'utf-8')
      return Buffer.from(b64, 'base64').toString('utf-8')
    }
  } catch (err) {
    console.error('Failed to decrypt stored Gemini API key:', err)
    return ''
  }
}

/**
 * Checks if a Gemini key is currently stored.
 */
export function hasStoredApiKey(): boolean {
  return fs.existsSync(KEY_FILE()) && getStoredApiKey().length > 5
}
