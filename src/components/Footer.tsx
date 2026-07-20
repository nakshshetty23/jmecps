export default function Footer() {
  return (
    <footer className="bg-card border-t border-border mt-16 py-12 text-text">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-8 mb-8">
          
          <div className="text-center md:text-left space-y-2">
            <h3 className="heading-display text-2xl tracking-widest text-accent mb-4">
              JMECPS
            </h3>
            <div className="flex flex-col space-y-3 font-mono text-sm opacity-80">
              <p className="flex items-center justify-center md:justify-start gap-3">
                <span className="text-primary">[E]</span>
                <a href="mailto:editor@jmecps.com" className="hover:text-accent transition-none">editor@jmecps.com</a>
              </p>
              <p className="flex items-center justify-center md:justify-start gap-3">
                <span className="text-primary">[A]</span>
                <a href="mailto:accounts@jmecps.com" className="hover:text-accent transition-none">accounts@jmecps.com</a>
              </p>
              <p className="flex items-center justify-center md:justify-start gap-3">
                <span className="text-primary">[W]</span>
                <a href="https://www.jmecps.com" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-none">www.jmecps.com</a>
              </p>
            </div>
          </div>

          <div className="text-center md:text-right mt-4 md:mt-12 max-w-md">
            <div className="flex flex-wrap justify-center md:justify-end gap-x-3 gap-y-2 font-mono text-xs text-primary tracking-widest uppercase">
              <span>Transparent Charges</span> 
              <span className="text-border hidden sm:inline">|</span> 
              <span>Ethical Publishing</span> 
              <span className="text-border hidden sm:inline">|</span> 
              <span>Quality Peer Review</span> 
              <span className="text-border hidden sm:inline">|</span> 
              <span>Global Open Access</span>
            </div>
          </div>
          
        </div>
        
        <div className="border-t border-border pt-6 mt-2 text-center md:text-left font-mono text-xs text-text opacity-60 flex flex-col md:flex-row justify-between items-center gap-2 tracking-widest uppercase">
          <p>SYS_DATE: {new Date().getFullYear()} // JMECPS. ALL_RIGHTS_RESERVED.</p>
          <p>Advancing Engineering Knowledge through Open Access Research.</p>
        </div>
      </div>
    </footer>
  );
}
