import { describe, it, expect } from 'vitest';
import { validatePassword, validateEmail, PASSWORD_MIN_LENGTH } from '../validation';

describe('Validation Utils', () => {
    describe('validatePassword', () => {
        it('should fail if password is empty', () => {
            const result = validatePassword('');
            expect(result.isValid).toBe(false);
            expect(result.message).toContain('requis');
        });

        it('should fail if password is too short', () => {
            const result = validatePassword('123');
            expect(result.isValid).toBe(false);
            expect(result.message).toContain(`au moins ${PASSWORD_MIN_LENGTH}`);
        });

        it('should fail if default firebase rule (min 6 chars) is not met', () => {
             // Assuming validation uses 6
             const result = validatePassword('abc12');
             expect(result.isValid).toBe(false);
        });

        it('should fail if no letter', () => {
             const result = validatePassword('123456');
             expect(result.isValid).toBe(false);
             expect(result.message).toContain('une lettre');
        });

        it('should fail if no number', () => {
             const result = validatePassword('abcdef');
             expect(result.isValid).toBe(false);
             expect(result.message).toContain('un chiffre');
        });

        it('should pass if valid', () => {
             const result = validatePassword('abc1234');
             expect(result.isValid).toBe(true);
        });
    });

    describe('validateEmail', () => {
        it('should return true for valid emails', () => {
            expect(validateEmail('test@example.com')).toBe(true);
            expect(validateEmail('test.name@dom.co.uk')).toBe(true);
        });

        it('should return false for invalid emails', () => {
            expect(validateEmail('test')).toBe(false);
            expect(validateEmail('test@')).toBe(false);
            expect(validateEmail('test@dom')).toBe(false); // Basic regex might pass this depending on implementation?
            // The regex in file is /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            // test@dom fails because no dot.
            expect(validateEmail('test@dom.')).toBe(false);
        });
    });
});
