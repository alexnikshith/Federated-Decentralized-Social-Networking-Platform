import { Link } from "react-router-dom";
import { Globe, Github } from "lucide-react";

const footerLinks = {
  platform: [
    { name: "About", href: "/about" },
    { name: "Documentation", href: "/docs" },
  ],
  legal: [
    { name: "Privacy Policy", href: "/privacy" },
    { name: "Terms of Service", href: "/terms" },
  ],
  resources: [
    { name: "Federation Protocol", href: "/protocol" },
    { name: "Instance Setup", href: "/setup" },
  ],
};

export function Footer() {
  return (
    <footer className="relative border-t border-white/[0.05] bg-black/5 backdrop-blur-3xl overflow-hidden mt-24">
      <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/[0.02] to-transparent pointer-events-none" />

      <div className="container mx-auto px-4 lg:px-8 pt-20 pb-4 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 lg:gap-16">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 items-center flex flex-col md:items-start text-center md:text-left">
            <Link to="/" className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <Globe className="w-5 h-5 text-cyan-500 dark:text-cyan-400" />
              </div>
              <span className="font-bold text-xl tracking-[0.2em] uppercase text-foreground dark:text-white">Nexus</span>
            </Link>
            <p className="text-sm text-foreground/30 dark:text-cyan-100/30 leading-relaxed mb-8 max-w-[200px] uppercase font-light tracking-wide">
              Engineering the next era of human connectivity.
            </p>
            <div className="flex flex-col items-center md:items-start gap-4">
              <div className="w-full flex justify-center md:justify-start">
                <a
                  href="https://github.com/RiteeshTM/Federated-Decentralized-Social-Networking-Platform"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-xl bg-foreground/[0.03] dark:bg-white/[0.03] border border-foreground/5 dark:border-white/5 flex items-center justify-center text-foreground/30 dark:text-white hover:text-cyan-600 dark:hover:text-cyan-400 hover:border-cyan-600/30 dark:hover:border-cyan-400/30 transition-all"
                >
                  <Github className="w-5 h-5" />
                </a>
              </div>
              <p className="text-[10px] font-bold tracking-[0.4em] uppercase text-foreground/70 dark:text-white/70 whitespace-nowrap text-center md:text-left w-full">
                © {new Date().getFullYear()} NEXUS
              </p>
            </div>

          </div>

          {/* Platform links */}
          <div>
            <h4 className="text-[10px] font-bold tracking-[0.3em] uppercase text-cyan-400 mb-8">Navigation</h4>
            <ul className="space-y-4">
              {footerLinks.platform.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-foreground/30 dark:text-white/15 hover:text-foreground dark:hover:text-white transition-colors uppercase tracking-widest font-light"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal links */}
          <div>
            <h4 className="text-[10px] font-bold tracking-[0.3em] uppercase text-cyan-400 mb-8">Protocols</h4>
            <ul className="space-y-4">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-foreground/30 dark:text-white/15 hover:text-foreground dark:hover:text-white transition-colors uppercase tracking-widest font-light"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources links */}
          <div>
            <h4 className="text-[10px] font-bold tracking-[0.3em] uppercase text-cyan-400 mb-8">Infrastructure</h4>
            <ul className="space-y-4">
              {footerLinks.resources.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-sm text-foreground/30 dark:text-white/15 hover:text-foreground dark:hover:text-white transition-colors uppercase tracking-widest font-light"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>

  );
}