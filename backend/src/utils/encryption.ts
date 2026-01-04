import crypto from 'crypto';

// Encryption utilities for sensitive employee data
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // For AES, this is always 16
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

// Get encryption key from environment
const getEncryptionKey = (): Buffer => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  
  // Derive key from the provided secret using PBKDF2
  const salt = crypto.scryptSync(key, 'employee-salt', KEY_LENGTH);
  return salt;
};

/**
 * Encrypts sensitive data using AES-256-GCM
 */
export const encrypt = (text: string): string => {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipher(ALGORITHM, key);
    cipher.setAAD(Buffer.from('employee-management'));
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Combine IV, authTag, and encrypted data
    const result = iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    return result;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Decrypts sensitive data using AES-256-GCM
 */
export const decrypt = (encryptedText: string): string => {
  try {
    const key = getEncryptionKey();
    const parts = encryptedText.split(':');
    
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipher(ALGORITHM, key);
    decipher.setAAD(Buffer.from('employee-management'));
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
};

/**
 * Hashes sensitive data for storage (one-way hash)
 */
export const hashSensitiveData = (data: string): string => {
  return crypto.createHash('sha256').update(data + process.env.ENCRYPTION_KEY).digest('hex');
};

/**
 * Validates if data appears to be encrypted
 */
export const isEncrypted = (data: string): boolean => {
  if (!data || typeof data !== 'string') return false;
  return data.includes(':') && data.split(':').length === 3;
};

/**
 * Masks sensitive data for display (shows only last 4 characters)
 */
export const maskSensitiveData = (data: string, visibleChars: number = 4): string => {
  if (!data) return '';
  if (data.length <= visibleChars) return '*'.repeat(data.length);
  return '*'.repeat(data.length - visibleChars) + data.slice(-visibleChars);
};

/**
 * Securely compares two strings in constant time
 */
export const secureCompare = (a: string, b: string): boolean => {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  
  if (aBuffer.length !== bBuffer.length) {
    return false;
  }
  
  return crypto.timingSafeEqual(aBuffer, bBuffer);
};