import Link from "next/link";
import AppShell from "@/components/appshell";
import { Clock, Crown, ChevronRight, Settings, User, Globe, Sparkles, Mic, FileText } from "lucide-react";

// 더미 데이터
const DUMMY_USER_NAME = "한지훈";
const DUMMY_IS_PRO = true;
const DUMMY_USAGE_TIME = 120;
const DUMMY_TOTAL_TIME = 999;

export default function TestMyPage() {
  return (
    <AppShell showBottomNav={false}>
      <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-orange-50/30">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-orange-100/50">
          <div className="max-w-[480px] mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <Link
                href="/test-home"
                className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 hover:bg-orange-200 transition-colors"
              >
                <ChevronRight className="w-5 h-5 rotate-180" />
              </Link>
              <h1 className="text-lg font-bold text-gray-900">Profile</h1>
              <button className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 hover:bg-orange-200 transition-colors">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-[480px] mx-auto px-6 py-6 space-y-6">
          {/* Profile Section */}
          <div className="pt-4">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="relative mb-4">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white text-3xl font-bold shadow-xl shadow-orange-300">
                  {DUMMY_USER_NAME[0]}
                </div>
                {DUMMY_IS_PRO && (
                  <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                    <Crown className="w-4 h-4 text-white" fill="currentColor" />
                  </div>
                )}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">{DUMMY_USER_NAME}</h2>
              <div className="flex items-center gap-2">
                {DUMMY_IS_PRO ? (
                  <>
                    <span className="px-3 py-1 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-semibold rounded-full flex items-center gap-1 shadow-md">
                      <Crown className="w-3 h-3" fill="currentColor" />
                      Premium
                    </span>
                    <span className="text-sm text-gray-500">Premium Member</span>
                  </>
                ) : (
                  <span className="text-sm text-gray-500">Free Member</span>
                )}
              </div>
            </div>
          </div>

          {/* Usage Card */}
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl p-6 text-white shadow-xl shadow-orange-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <Sparkles className="w-5 h-5 opacity-80" />
            </div>
            <h3 className="text-white/90 text-sm font-medium mb-2">This Month Usage</h3>
            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-4xl font-bold">{DUMMY_USAGE_TIME}</span>
              <span className="text-lg opacity-80">/ {DUMMY_TOTAL_TIME}</span>
              <span className="text-base opacity-70">min</span>
            </div>
            <div className="mt-4 h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all"
                style={{ width: `${(DUMMY_USAGE_TIME / DUMMY_TOTAL_TIME) * 100}%` }}
              />
            </div>
            <p className="text-white/70 text-xs mt-2">
              {Math.round(((DUMMY_TOTAL_TIME - DUMMY_USAGE_TIME) / DUMMY_TOTAL_TIME) * 100)}% remaining
            </p>
          </div>

          {/* Premium Upgrade Card */}
          {!DUMMY_IS_PRO && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-6 border-2 border-amber-200 shadow-lg">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-200">
                  <Crown className="w-7 h-7 text-white" fill="currentColor" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Upgrade to Premium</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Unlock unlimited recordings and advanced features
                  </p>
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs">✓</span>
                      </div>
                      <span>Unlimited recording time</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs">✓</span>
                      </div>
                      <span>Advanced AI transcription</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs">✓</span>
                      </div>
                      <span>Priority support</span>
                    </div>
                  </div>
                  <button className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-xl shadow-lg shadow-orange-200 hover:shadow-xl hover:shadow-orange-300 transition-all active:scale-[0.98]">
                    Upgrade Now
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Premium Info (if Pro) */}
          {DUMMY_IS_PRO && (
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-orange-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-200">
                    <Crown className="w-6 h-6 text-white" fill="currentColor" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Premium Plan</h3>
                    <p className="text-sm text-gray-500">Active subscription</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
              <button className="w-full py-2.5 bg-orange-50 text-orange-600 font-medium rounded-xl hover:bg-orange-100 transition-colors border border-orange-200">
                Manage Subscription
              </button>
            </div>
          )}

          {/* Settings Menu */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider px-1 mb-2">
              Settings
            </h3>
            <Link
              href="#"
              className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm border border-orange-100 hover:shadow-md hover:border-orange-200 transition-all active:scale-[0.98] group"
            >
              <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                <User className="w-6 h-6 text-orange-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">Account</h4>
                <p className="text-sm text-gray-500">Manage your account</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-orange-600 transition-colors" />
            </Link>

            <Link
              href="#"
              className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm border border-orange-100 hover:shadow-md hover:border-orange-200 transition-all active:scale-[0.98] group"
            >
              <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                <Globe className="w-6 h-6 text-orange-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900">Language</h4>
                <p className="text-sm text-gray-500">Change language settings</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-orange-600 transition-colors" />
            </Link>
          </div>

          {/* Bottom Spacing */}
          <div className="h-6" />
        </main>

        {/* Custom Bottom Nav for Test */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-orange-100 z-50 safe-area-inset-bottom">
          <div className="max-w-[480px] mx-auto">
            <div className="flex items-center justify-around px-4 py-3">
              <Link
                href="/test-home"
                className="flex flex-col items-center gap-1 px-4 py-2 text-gray-500 hover:text-orange-600 transition-colors"
              >
                <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium">Notes</span>
              </Link>
              <Link
                href="/test-recording"
                className="flex flex-col items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-xl shadow-orange-300 -translate-y-2 transition-transform hover:scale-105 active:scale-95"
              >
                <Mic className="w-7 h-7" />
              </Link>
              <Link
                href="/test-mypage"
                className="flex flex-col items-center gap-1 px-4 py-2 text-orange-600"
              >
                <div className="w-6 h-6 rounded-lg bg-orange-600/10 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium">Profile</span>
              </Link>
            </div>
          </div>
          <div className="h-6" />
        </nav>
      </div>
    </AppShell>
  );
}

