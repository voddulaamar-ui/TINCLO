import { Link } from "react-router-dom";
import FeaturesSection from "./FeaturesSection";
import BenefitsSection from "./BenefitsSection";
import UseCasesSection from "./UseCasesSection";
import FinalCTASection from "./FinalCTASection";

const LandingPage = () => {
  return (
    <div className="min-h-screen text-white bg-landing dark:bg-landing-dark">
      {/* Nav */}
      <nav className="flex justify-between items-center px-6 md:px-12 py-5 bg-white/5 backdrop-blur-xl border-b border-white/10">
        <Link to="/" className="text-2xl font-bold no-underline text-white">💼 TINCLO</Link>
        <div className="flex items-center gap-3 ml-auto">
          <Link to="/jobs" className="bg-white text-indigo-700 px-5 py-2 rounded-full text-sm font-semibold transition-all hover:-translate-y-0.5 hover:shadow-lg">
            Browse Jobs
          </Link>
          <Link to="/login" className="text-white/90 font-medium text-sm transition-opacity hover:opacity-70">
            Login
          </Link>
          <Link to="/signup" className="bg-white/10 backdrop-blur text-white font-medium text-sm px-4 py-2 rounded-full border border-white/20 transition-all hover:bg-white/20">
            Sign Up
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-indigo-500/20 blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-purple-600/20 blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex items-center justify-center min-h-[70vh] px-6 md:px-12 py-20">
          <div className="flex items-center justify-between gap-16 max-w-[1200px] w-full max-md:flex-col max-md:gap-10">
            {/* Hero text */}
            <div className="flex-1 max-w-[600px] max-md:max-w-full max-md:text-center">
              <span className="inline-block px-4 py-1.5 mb-6 rounded-full bg-white/10 border border-white/20 text-xs font-semibold tracking-wide uppercase">
                AI-Powered Career Platform
              </span>
              <h1 className="text-5xl md:text-6xl font-extrabold mb-5 leading-[1.1] text-left max-md:text-4xl max-md:text-center">
                Find Your Dream Job
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-purple-300"> with Smart Matching</span>
              </h1>
              <p className="text-lg mb-10 text-white/75 leading-relaxed text-left max-md:text-base max-md:text-center">
                Swipe through opportunities tailored to your skills and preferences. Track applications, save favorites, and land your perfect role faster.
              </p>
              <div className="flex gap-4 justify-start flex-wrap max-md:justify-center">
                <Link to="/signup"
                  className="bg-white text-indigo-700 px-8 py-3.5 rounded-full font-bold text-base transition-all shadow-lg hover:-translate-y-0.5 hover:shadow-xl no-underline"
                  aria-label="Get TINCLO for free">
                  Get Started Free
                </Link>
                <Link to="/jobs"
                  className="bg-white/10 text-white px-8 py-3.5 border border-white/25 rounded-full font-semibold text-base transition-all hover:bg-white/20 hover:-translate-y-0.5 no-underline"
                  aria-label="Browse jobs">
                  See How It Works
                </Link>
              </div>
            </div>

            {/* Hero visual */}
            <div className="flex-[0_0_380px] flex items-center justify-center max-md:flex-none max-md:w-full max-md:max-w-[380px]">
              <div className="w-full aspect-[4/3] rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-2xl flex items-center justify-center overflow-hidden">
                <img
                  src="/assets/hero-screenshot.svg"
                  alt="TINCLO job matching interface"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<div class="flex flex-col items-center justify-center gap-3 p-8 text-center"><span class="text-5xl">💼</span><p class="text-white/60 text-sm">Swipe. Match. Hired.</p></div>';
                  }}
                  loading="eager"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <FeaturesSection />
      <BenefitsSection />
      <UseCasesSection />

      {/* ── Recruiter CTA Section ─────────────────────────────────── */}
      <section className="py-20 px-6 md:px-12 bg-white/5 border-y border-white/10">
        <div className="max-w-[1100px] mx-auto flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1">
            <span className="inline-block px-4 py-1.5 bg-indigo-500/20 rounded-full text-sm font-bold tracking-wide mb-5 border border-indigo-400/30">🏢 For Recruiters</span>
            <h2 className="text-4xl font-bold leading-tight mb-5 max-md:text-3xl">
              Find Top Talent Faster
            </h2>
            <p className="text-lg text-white/70 mb-8 leading-relaxed">
              Post jobs in minutes, view matched candidates ranked by skill fit, and manage your entire hiring pipeline from one dashboard.
            </p>
            <ul className="list-none p-0 m-0 flex flex-col gap-3 mb-8">
              {[
                { icon: '📝', text: 'Post, edit and close jobs with one click' },
                { icon: '🎯', text: 'Candidates ranked by rule-based match score' },
                { icon: '📊', text: 'Track applicants through pipeline stages' },
                { icon: '🔔', text: 'Real-time notifications when candidates apply' },
                { icon: '🔒', text: 'Only you can see and manage your own jobs' },
              ].map(({ icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm text-white/80">
                  <span className="text-lg flex-shrink-0">{icon}</span>
                  <span>{text}</span>
                </li>
              ))}
            </ul>
            <Link to="/signup"
              className="inline-block bg-white text-indigo-700 px-7 py-3.5 rounded-full font-bold transition-all shadow-lg hover:-translate-y-0.5 no-underline"
              onClick={() => localStorage.setItem('tinclo_signup_role', 'recruiter')}>
              Start Hiring for Free →
            </Link>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-4 max-w-[400px] w-full">
            {[
              { value: '50%',  label: 'Faster Shortlisting', icon: '⚡' },
              { value: '6',    label: 'Pipeline Stages',     icon: '📊' },
              { value: '100%', label: 'Rule-Based Matching', icon: '🎯' },
              { value: '∞',    label: 'Jobs You Can Post',   icon: '📝' },
            ].map(s => (
              <div key={s.label} className="bg-white/5 backdrop-blur rounded-2xl p-5 text-center border border-white/10 hover:bg-white/10 transition-all">
                <div className="text-2xl mb-2">{s.icon}</div>
                <div className="text-2xl font-black mb-1">{s.value}</div>
                <div className="text-xs text-white/60 font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature Highlights ───────────────────────────────── */}
      <section className="py-16 px-6 md:px-12">
        <div className="max-w-[1100px] mx-auto">
          <h2 className="text-3xl font-bold text-center mb-10">Platform Highlights</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { icon: '🔐', title: 'Secure Auth',       desc: 'JWT login for Candidates & Recruiters' },
              { icon: '🎯', title: 'Smart Matching',    desc: 'Skills · Domain · Location · Experience' },
              { icon: '💼', title: 'Job Feed',          desc: 'Sorted by match %, newest, filtered' },
              { icon: '👆', title: 'Swipe System',      desc: 'Swipe right to save, left to skip' },
              { icon: '📊', title: 'App Tracker',       desc: '6-stage pipeline per application' },
              { icon: '🏢', title: 'Recruiter Hub',     desc: 'Post jobs, manage applicants live' },
              { icon: '👤', title: 'Rich Profiles',     desc: 'Skills, projects, education, links' },
              { icon: '🔔', title: 'Live Notifications',desc: 'WebSocket push for new jobs & updates' },
            ].map(f => (
              <div key={f.title} className="bg-white/5 backdrop-blur rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all">
                <div className="text-xl mb-2">{f.icon}</div>
                <h3 className="text-white font-bold text-xs m-0 mb-1">{f.title}</h3>
                <p className="text-white/50 text-[11px] m-0 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FinalCTASection />

      {/* Footer */}
      <footer className="bg-black/20 backdrop-blur-md px-6 md:px-12 pt-12 pb-6 border-t border-white/10">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-10 max-w-[1200px] mx-auto mb-8">
          <div className="flex flex-col gap-3">
            <h3 className="text-xl font-bold text-white">💼 TINCLO</h3>
            <p className="text-sm leading-relaxed text-white/70">
              Your smart job matching platform. Find your dream career with just a swipe.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-semibold text-white mb-1">Quick Links</h4>
            <ul className="list-none p-0 m-0 flex flex-col gap-2">
              <li><Link to="/jobs" className="text-white/70 no-underline text-sm hover:text-white transition">Browse Jobs</Link></li>
              <li><Link to="/signup" className="text-white/70 no-underline text-sm hover:text-white transition">Sign Up</Link></li>
              <li><Link to="/login" className="text-white/70 no-underline text-sm hover:text-white transition">Login</Link></li>
            </ul>
          </div>
          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-semibold text-white mb-1">Contact</h4>
            <a href="mailto:voddulaamar@gmail.com" className="text-white/70 no-underline text-sm hover:text-white transition flex items-center gap-2">
              ✉️ voddulaamar@gmail.com
            </a>
            <a href="tel:+917981954727" className="text-white/70 no-underline text-sm hover:text-white transition flex items-center gap-2">
              📞 +91 7981954727
            </a>
          </div>
        </div>
        <div className="text-center pt-6 border-t border-white/10 max-w-[1200px] mx-auto">
          <p className="text-xs text-white/50">&copy; {new Date().getFullYear()} TINCLO. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
