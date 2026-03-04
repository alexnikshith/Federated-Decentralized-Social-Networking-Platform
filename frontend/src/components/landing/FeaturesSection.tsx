import {
  Shield,
  Zap,
  Cpu,
  Share2,
  Lock,
  Activity,
  Orbit
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const features = [
  {
    icon: Shield,
    title: "NEURAL PRIVACY",
    description: "Your consciousness, your data. No tracking, no profiling, just pure sovereign encryption.",
    glow: "shadow-cyan-500/20",
    border: "border-cyan-500/20",
    text: "text-cyan-400"
  },
  {
    icon: Cpu,
    title: "DECENTRALIZED CORE",
    description: "Operate on independent nodes. No central authority, no single point of failure. The network is everywhere.",
    glow: "shadow-purple-500/20",
    border: "border-purple-500/20",
    text: "text-purple-400"
  },
  {
    icon: Orbit,
    title: "COSMIC FEDERATION",
    description: "Seamlessly bridge across diverse communities. A unified galaxy of unique social instances.",
    glow: "shadow-blue-500/20",
    border: "border-blue-500/20",
    text: "text-blue-400"
  },
  {
    icon: Lock,
    title: "SOVEREIGN IDENTITY",
    description: "Your identity lives on your terms. Decoupled from corporate control and algorithmic bias.",
    glow: "shadow-indigo-500/20",
    border: "border-indigo-500/20",
    text: "text-indigo-400"
  },
  {
    icon: Zap,
    title: "REAL-TIME SYNC",
    description: "Instantaneous state propagation across the mesh. Experience the speed of thought in every interaction.",
    glow: "shadow-white/10",
    border: "border-white/20",
    text: "text-white"
  },
  {
    icon: Activity,
    title: "TRANSPARENT PULSE",
    description: "Open-source metrics without surveillance. Visualize the network's health in real-time.",
    glow: "shadow-emerald-500/20",
    border: "border-emerald-500/20",
    text: "text-emerald-400"
  },
];

export function FeaturesSection() {
  return (
    <section className="py-32 relative overflow-hidden bg-transparent">
      {/* Background Ambience - very subtle */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-b from-transparent via-cyan-500/[0.02] to-transparent pointer-events-none" />

      <div className="container mx-auto px-4 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-24">
          <motion.h2
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold mb-6 tracking-tight text-white uppercase"
          >
            Universal <span className="text-cyan-400">Architectures</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-sm text-cyan-100/40 uppercase tracking-[0.3em] font-mono font-bold"
          >
            [ ENGINEERING THE FUTURE OF HUMAN CONNECTIVITY ]
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.6 }}
              className={cn(
                "group relative p-8 rounded-sm bg-white/[0.01] border-t border-l-2 backdrop-blur-xl transition-all duration-500",
                "hover:bg-white/[0.03] hover:-translate-y-2",
                feature.border,
                `hover:${feature.glow} hover:shadow-2xl`
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-sm border-t border-l-2 flex items-center justify-center mb-8 transition-all duration-500 group-hover:scale-110",
                "bg-white/[0.03] border border-white/5",
                feature.text, feature.border
              )}>
                <feature.icon className="w-6 h-6" />
              </div>

              <h3 className="text-sm font-bold font-mono tracking-widest mb-4 text-white group-hover:text-cyan-400 transition-colors uppercase">
                {feature.title}
              </h3>

              <p className="text-cyan-100/30 text-sm leading-relaxed font-light group-hover:text-cyan-100/60 transition-colors">
                {feature.description}
              </p>

              {/* Decorative Corner */}
              <div className={cn(
                "absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 opacity-20 group-hover:opacity-100 transition-opacity",
                feature.border
              )} />
              <div className={cn(
                "absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 opacity-20 group-hover:opacity-100 transition-opacity",
                feature.border
              )} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

