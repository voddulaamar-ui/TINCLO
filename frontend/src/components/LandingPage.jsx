import { Link } from "react-router-dom";
import FeaturesSection from "./FeaturesSection";
import BenefitsSection from "./BenefitsSection";
import UseCasesSection from "./UseCasesSection";
import FinalCTASection from "./FinalCTASection";

const LandingPage = () => {
  return (
  <div
    className="min-h-screen text-white"
    style={{ background: 'linear-gradient(135deg, #81d1e1 0%, #d0d997 100%)' }}
  >
    {/* Nav */}
    <nav className="flex justify-between items-center px-12 py-6 bg-white/10 backdrop-blur-md">
      <Link to="/" className="text-2xl font-bold" style={{ textDecoration: 'none', color: 'inherit' }}>💼 TINCLO</Link>
      <div className="flex items-center gap-4 ml-auto">
        <Link to="/jobs" className="bg-white text-[#667eea] px-6 py-2 rounded-full font-semibold transition-transform hover:-translate-y-0.5">
          Browse Jobs
        </Link>
        <Link to="/login" className="text-white font-medium transition-opacity hover:opacity-80">
          Login
        </Link>
        <Link to="/signup" className="bg-white/20 backdrop-blur-sm text-white font-medium px-5 py-2 rounded-full border border-white/40 transition-all hover:bg-white/30">
          Sign Up
        </Link>
      </div>
    </nav>

    {/* Hero */}
    <div className="flex items-center justify-center min-h-[60vh] px-12 py-16">
      <div className="flex items-center justify-between gap-16 max-w-[1200px] w-full max-md:flex-col max-md:gap-8">
        {/* Hero text */}
        <div className="flex-1 max-w-[600px] max-md:max-w-full max-md:text-center">
          <h1 className="text-5xl font-bold mb-4 leading-tight text-left max-md:text-3xl max-md:text-center">
            Find Your Dream Job with Smart Matching
          </h1>
          <p className="text-xl mb-10 opacity-90 leading-relaxed text-left max-md:text-lg max-md:text-center">
            Swipe through opportunities tailored to your skills and preferences. Track applications, save favorites, and land your perfect role faster.
          </p>
          <div className="flex gap-6 justify-start flex-wrap max-md:justify-center">
            <Link
              to="/signup"
              className="bg-white text-[#667eea] px-10 py-4 rounded-full font-semibold text-lg transition-all shadow-[0_4px_15px_rgba(0,0,0,0.2)] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,0,0,0.3)]"
              aria-label="Get TINCLO for free - Sign up now to start matching with your dream job"
            >
              Get it free
            </Link>
            <Link
              to="/jobs"
              className="bg-transparent text-white px-10 py-4 border-2 border-white rounded-full font-semibold text-lg transition-all hover:bg-red-800/75 hover:-translate-y-0.5"
              aria-label="See how TINCLO works - Browse available jobs and explore the platform"
            >
              See how it works
            </Link>
          </div>
        </div>

        {/* Hero visual */}
        <div className="flex-[0_0_400px] flex items-center justify-center max-md:flex-none max-md:w-full max-md:max-w-[400px]">
          <img
            src="/assets/hero-screenshot.svg"
            alt="TINCLO application interface showing job matching swipe feature and application tracking dashboard"
            className="w-full h-auto aspect-[4/3] object-cover rounded-[20px] border-2 border-[rgba(234,76,19,0.3)] shadow-[0_8px_32px_rgba(0,0,0,0.1)] transition-all hover:scale-105 hover:shadow-[0_12px_48px_rgba(0,0,0,0.2)]"
            style={{ background: 'rgba(219, 201, 171, 0.88)', backdropFilter: 'blur(20px)' }}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"%3E%3Crect fill="%23667eea" width="800" height="600"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="32" fill="%23ffffff"%3EImage Unavailable%3C/text%3E%3C/svg%3E';
              e.target.alt = 'Screenshot unavailable - TINCLO job matching platform';
            }}
            loading="eager"
          />
        </div>
      </div>
    </div>

    <FeaturesSection />

    <BenefitsSection />

    <UseCasesSection />

    {/* ── Recruiter CTA Section ─────────────────────────────────── */}
    <div className="py-20 px-12 text-white" style={{ background: 'rgba(0,0,0,0.15)' }}>
      <div className="max-w-[1100px] mx-auto flex flex-col lg:flex-row items-center gap-16">
        {/* Left — text */}
        <div className="flex-1">
          <span className="inline-block px-4 py-1.5 bg-white/20 rounded-full text-sm font-bold tracking-wide mb-5">🏢 For Recruiters</span>
          <h2 className="text-4xl font-bold leading-tight mb-5 max-md:text-3xl">
            Find Top Talent Faster with TINCLO
          </h2>
          <p className="text-lg opacity-90 mb-8 leading-relaxed">
            Post jobs in minutes, view matched candidates ranked by skill fit, and manage your entire hiring pipeline from one dashboard.
          </p>
          {/* Feature bullets */}
          <ul className="list-none p-0 m-0 flex flex-col gap-3 mb-8">
            {[
              { icon: '📝', text: 'Post, edit and close jobs with one click' },
              { icon: '🎯', text: 'Candidates ranked by rule-based match score' },
              { icon: '📊', text: 'Track applicants through 6 pipeline stages' },
              { icon: '🔔', text: 'Real-time notifications when candidates apply' },
              { icon: '🔒', text: 'Only you can see and manage your own jobs' },
            ].map(({ icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-base opacity-90">
                <span className="text-xl flex-shrink-0">{icon}</span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
          <Link
            to="/signup"
            className="inline-block bg-white text-[#667eea] px-8 py-4 rounded-full font-bold text-lg transition-all shadow-[0_4px_20px_rgba(0,0,0,0.2)] hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(0,0,0,0.3)] no-underline"
            onClick={() => localStorage.setItem('tinclo_signup_role', 'recruiter')}
          >
            Start Hiring for Free →
          </Link>
        </div>

        {/* Right — stat cards */}
        <div className="flex-1 grid grid-cols-2 gap-4 max-w-[420px] w-full">
          {[
            { value: '50%',  label: 'Faster Shortlisting',     icon: '⚡' },
            { value: '6',    label: 'Pipeline Stages',          icon: '📊' },
            { value: '100%', label: 'Rule-Based Matching',      icon: '🎯' },
            { value: '∞',    label: 'Jobs You Can Post',        icon: '📝' },
          ].map(s => (
            <div key={s.label} className="bg-white/15 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/20 hover:bg-white/25 transition-all">
              <div className="text-3xl mb-2">{s.icon}</div>
              <div className="text-3xl font-black mb-1">{s.value}</div>
              <div className="text-sm opacity-80 font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* ── Phase 1 Feature Highlights ───────────────────────────── */}
    <div className="py-16 px-12" style={{ background: 'rgba(0,0,0,0.1)' }}>
      <div className="max-w-[1100px] mx-auto">
        <h2 className="text-3xl font-bold text-center mb-10 text-white">Everything in Phase 1</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
            <div key={f.title} className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/15 hover:bg-white/20 transition-all">
              <div className="text-2xl mb-2">{f.icon}</div>
              <h3 className="text-white font-bold text-sm m-0 mb-1">{f.title}</h3>
              <p className="text-white/70 text-xs m-0 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>

    <FinalCTASection />

    {/* Footer */}
    <footer className="bg-black/20 backdrop-blur-md px-12 pt-12 pb-6 mt-8">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-12 max-w-[1200px] mx-auto mb-8 max-md:grid-cols-1 max-md:gap-8">

        {/* Brand section */}
        <div className="flex flex-col gap-4 max-md:text-center">
          <h3 className="text-[1.75rem] font-bold text-white m-0">💼 TINCLO</h3>
          <p className="text-[0.95rem] leading-relaxed opacity-90 m-0">
            Your smart job matching platform. Find your dream career with just a swipe.
          </p>
        </div>

        {/* Quick links */}
        <div className="flex flex-col gap-4 max-md:text-center">
          <h4 className="text-[1.2rem] font-semibold text-white m-0 mb-2">Quick Links</h4>
          <ul className="list-none p-0 m-0 flex flex-col gap-3 max-md:items-center">
            <li>
              <Link to="/jobs" className="text-white/85 no-underline text-[0.95rem] transition-all inline-block hover:text-white hover:translate-x-1">Browse Jobs</Link>
            </li>
            <li>
              <Link to="/signup" className="text-white/85 no-underline text-[0.95rem] transition-all inline-block hover:text-white hover:translate-x-1">Sign Up — Candidate</Link>
            </li>
            <li>
              <Link to="/signup" className="text-white/85 no-underline text-[0.95rem] transition-all inline-block hover:text-white hover:translate-x-1">Sign Up — Recruiter</Link>
            </li>
            <li>
              <Link to="/login" className="text-white/85 no-underline text-[0.95rem] transition-all inline-block hover:text-white hover:translate-x-1">Login</Link>
            </li>
          </ul>
        </div>

        {/* Contact */}
        <div className="flex flex-col gap-4 max-md:text-center">
          <h4 className="text-[1.2rem] font-semibold text-white m-0 mb-2">Contact Developer</h4>
          <div className="flex flex-col gap-4">
            <a
              href="mailto:voddulaamar@gmail.com"
              className="flex items-center gap-3 text-white/90 no-underline text-[0.95rem] transition-all px-3 py-3 bg-white/10 rounded-[10px] border border-white/20 hover:bg-red-800/65 hover:translate-x-1 hover:text-white max-md:justify-center"
            >
              <svg className="w-5 h-5 shrink-0 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 6L12 13L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="break-words">voddulaamar@gmail.com</span>
            </a>
            <a
              href="tel:+917981954727"
              className="flex items-center gap-3 text-white/90 no-underline text-[0.95rem] transition-all px-3 py-3 bg-white/10 rounded-[10px] border border-white/20 hover:bg-red-800/65 hover:translate-x-1 hover:text-white max-md:justify-center"
            >
              <svg className="w-5 h-5 shrink-0 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 16.92V19.92C22.0011 20.1985 21.9441 20.4742 21.8325 20.7293C21.7209 20.9845 21.5573 21.2136 21.3521 21.4019C21.1468 21.5901 20.9046 21.7335 20.6407 21.8227C20.3769 21.9119 20.0974 21.9451 19.82 21.92C16.7428 21.5856 13.787 20.5341 11.19 18.85C8.77382 17.3147 6.72533 15.2662 5.18999 12.85C3.49997 10.2412 2.44824 7.27099 2.11999 4.18C2.095 3.90347 2.12787 3.62476 2.21649 3.36162C2.30512 3.09849 2.44756 2.85669 2.63476 2.65162C2.82196 2.44655 3.0498 2.28271 3.30379 2.17052C3.55777 2.05833 3.83233 2.00026 4.10999 2H7.10999C7.5953 1.99522 8.06579 2.16708 8.43376 2.48353C8.80173 2.79999 9.04207 3.23945 9.10999 3.72C9.23662 4.68007 9.47144 5.62273 9.80999 6.53C9.94454 6.88792 9.97366 7.27691 9.8939 7.65088C9.81415 8.02485 9.62886 8.36811 9.35999 8.64L8.08999 9.91C9.51355 12.4135 11.5864 14.4864 14.09 15.91L15.36 14.64C15.6319 14.3711 15.9751 14.1858 16.3491 14.1061C16.7231 14.0263 17.1121 14.0555 17.47 14.19C18.3773 14.5286 19.3199 14.7634 20.28 14.89C20.7658 14.9585 21.2094 15.2032 21.5265 15.5775C21.8437 15.9518 22.0122 16.4296 22 16.92Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>+91 7981954727</span>
            </a>
          </div>
        </div>
      </div>

      {/* Footer bottom */}
      <div className="text-center pt-8 border-t border-[rgba(0,117,127,0.2)] max-w-[1200px] mx-auto max-md:pt-6">
        <p className="my-2 text-[0.9rem] opacity-80">&copy; {new Date().getFullYear()} TINCLO. All rights reserved.</p>
        <p className="my-2 text-[0.9rem] opacity-70 italic">Built with ❤️ for job seekers</p>
      </div>
    </footer>
  </div>
);
};

export default LandingPage;
