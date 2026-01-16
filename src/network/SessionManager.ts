/**
 * SessionManager - Handles session creation, invite links, and URL parsing
 */
export class SessionManager {
  /**
   * Generate a unique 6-character alphanumeric session ID
   * Format: A1B2C3 (uppercase letters and numbers)
   */
  generateSessionId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let sessionId = '';
    for (let i = 0; i < 6; i++) {
      sessionId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return sessionId;
  }

  /**
   * Create an invite link with the session ID
   * @param sessionId The session ID to include in the link
   * @returns Full invite URL
   */
  createInviteLink(sessionId: string): string {
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?session=${sessionId}&join=true`;
  }

  /**
   * Parse the current URL for join intent and session ID
   * @returns Object containing sessionId and join intent flag
   */
  parseJoinUrl(): { sessionId: string | null; isJoinIntent: boolean } {
    const params = new URLSearchParams(window.location.search);
    return {
      sessionId: params.get('session'),
      isJoinIntent: params.get('join') === 'true',
    };
  }

  /**
   * Validate session ID format
   * @param sessionId The session ID to validate
   * @returns True if valid (6 alphanumeric characters)
   */
  validateSessionId(sessionId: string | null): boolean {
    if (!sessionId) return false;
    const regex = /^[A-Z0-9]{6}$/;
    return regex.test(sessionId);
  }

  /**
   * Copy text to clipboard
   * @param text The text to copy
   * @returns Promise resolving to true if successful
   */
  async copyToClipboard(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);

      // Fallback method for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        return successful;
      } catch (fallbackError) {
        console.error('Fallback copy failed:', fallbackError);
        return false;
      }
    }
  }

  /**
   * Clear join parameters from URL without page reload
   */
  clearJoinParams(): void {
    const url = new URL(window.location.href);
    url.searchParams.delete('session');
    url.searchParams.delete('join');
    window.history.replaceState({}, '', url.toString());
  }

  /**
   * Get session ID from current URL
   * @returns Session ID if present, null otherwise
   */
  getSessionFromUrl(): string | null {
    const params = new URLSearchParams(window.location.search);
    return params.get('session');
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();
