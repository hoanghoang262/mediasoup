interface MediaIconProps {
  /**
   * The type of media to display (audio or video)
   */
  type: 'audio' | 'video';
  
  /**
   * Whether the media is enabled
   */
  enabled: boolean;
}

/**
 * MediaIcon displays audio or video icons based on their enabled state
 */
export function MediaIcon({ type, enabled }: MediaIconProps) {
  // Common styling for all icons
  const className = `${enabled ? 'text-green-500' : 'text-red-500'}`;
  
  if (type === 'audio') {
    return enabled ? (
      <div className={className}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
          <line x1="12" x2="12" y1="19" y2="22"></line>
        </svg>
      </div>
    ) : (
      <div className={className}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="2" x2="22" y1="2" y2="22"></line>
          <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"></path>
          <path d="M5 10v2a7 7 0 0 0 12 5"></path>
          <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"></path>
          <path d="M9 9v3a3 3 0 0 0 5.12 2.12"></path>
          <line x1="12" x2="12" y1="19" y2="22"></line>
        </svg>
      </div>
    );
  }
  
  if (type === 'video') {
    return enabled ? (
      <div className={className}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 8.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z"></path>
          <path d="M10.5 9a5 5 0 0 0-7.5 6c0 .7.13 1.37.37 2"></path>
          <path d="M17 15.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"></path>
          <path d="M10.5 14a5 5 0 0 1 7.5-6c.697 0 1.37.13 2 .37"></path>
        </svg>
      </div>
    ) : (
      <div className={className}>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m7 6 10 10-3.3 3.3a8 8 0 0 1-10-10L7 6Z"></path>
          <path d="m16 7 1 1a8 8 0 0 1 0 10l-3.3-3.3"></path>
          <line x1="1" y1="1" x2="23" y2="23"></line>
        </svg>
      </div>
    );
  }
  
  return null;
} 