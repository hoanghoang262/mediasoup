interface LoadingScreenProps {
  /**
   * Title to display
   */
  title: string;
  
  /**
   * Description to display
   */
  description: string;

  /**
   * Whether to show a retry button
   */
  showRetry?: boolean;
  
  /**
   * Callback when retry button is clicked
   */
  onRetry?: () => void;
}

/**
 * LoadingScreen displays a loading animation with a title and description
 */
export function LoadingScreen({ 
  title, 
  description, 
  showRetry = false, 
  onRetry 
}: LoadingScreenProps) {
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center max-w-md p-8 rounded-xl bg-background/80 backdrop-blur-sm border border-border shadow-lg">
        {!showRetry ? (
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping"></div>
            <div className="absolute inset-2 rounded-full border-2 border-primary/40 animate-ping" style={{ animationDelay: '0.3s' }}></div>
            <div className="absolute inset-4 rounded-full border-2 border-primary/60 animate-ping" style={{ animationDelay: '0.6s' }}></div>
            <div className="absolute inset-0 rounded-full border-2 border-primary/80 border-t-transparent animate-spin"></div>
          </div>
        ) : (
          <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        )}
        
        <h2 className="text-2xl font-bold mb-2">{title}</h2>
        <p className="text-muted-foreground mb-4">{description}</p>
        
        {showRetry ? (
          <button 
            onClick={onRetry}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors duration-200 mb-4"
          >
            Retry Connection
          </button>
        ) : null}
        
        <div className="flex justify-center gap-2 text-sm text-muted-foreground">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>End-to-end encrypted</span>
        </div>
      </div>
    </div>
  );
} 