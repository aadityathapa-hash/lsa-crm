import { useAuth } from "../hooks/useAuth";
import { Logo } from "../components/ui";

export default function Login() {
  const { signInWithGoogle } = useAuth();

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4">
      <div className="bg-white rounded-[14px] shadow-[0_1px_2px_rgba(20,24,31,.05),0_12px_40px_-16px_rgba(20,24,31,.18)] border border-ink-100 p-8 w-full max-w-sm text-center">
        <div className="flex justify-center mb-4"><Logo size={44} /></div>
        <h1 className="text-[19px] tracking-tight text-ink-900 mb-1">
          <span className="font-bold">LSA</span> Operations
        </h1>
        <p className="text-ink-400 text-[13px] mb-6">1-800-GOT-JUNK? · South Wind</p>
        <button
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-3 bg-white border border-ink-200 rounded-lg px-4 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-50 hover:border-ink-300 transition-all"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
          </svg>
          Sign in with Google
        </button>
        <p className="text-xs text-ink-400 mt-4">Internal operations tool</p>
      </div>
    </div>
  );
}
