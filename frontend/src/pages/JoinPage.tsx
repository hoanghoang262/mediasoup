import { JoinForm } from '@/components/join/JoinForm';

export function JoinPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/5 via-background to-accent/5 overflow-hidden relative">
      {/* Background decorative elements */}
      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] opacity-70"></div>
      <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[100px] opacity-70"></div>
      
      <header className="py-6 px-8 z-10">
        <div className="container mx-auto">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">VideoMeet</h1>
          </div>
        </div>
      </header>
      
      <main className="flex-1 flex items-center justify-center p-4 md:p-8 z-10">
        <div className="container max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-20">
          <div className="w-full max-w-md lg:max-w-xl">
            <div className="space-y-6">
              <h2 className="text-4xl md:text-5xl font-bold leading-tight text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                Simple, Secure Video Meetings
              </h2>
              <p className="text-xl text-foreground/80">
                Connect with anyone, anywhere with high-quality video conferencing
              </p>
              
              <div className="grid gap-4 pt-4">
                <div className="flex items-center gap-4 p-4 rounded-lg bg-background/50 border border-border">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-lg">Secure Meetings</h3>
                    <p className="text-muted-foreground">All meetings are securely encrypted</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 p-4 rounded-lg bg-background/50 border border-border">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-lg">Multiple Participants</h3>
                    <p className="text-muted-foreground">Host meetings with multiple participants</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="w-full max-w-lg">
            <JoinForm />
          </div>
        </div>
      </main>
      
      <footer className="py-6 px-8 text-center text-sm text-muted-foreground z-10">
        <div className="container mx-auto">
          <div className="flex items-center justify-center gap-8">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Secure & private</span>
            </div>
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>High performance</span>
            </div>
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Free to use</span>
            </div>
          </div>
          <p className="mt-4">© 2023 VideoMeet. Built with MediaSoup and React.</p>
        </div>
      </footer>
    </div>
  );
} 