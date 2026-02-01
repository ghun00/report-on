import Link from "next/link";
import AppShell from "@/components/appshell";
import { Mic, FileText, Clock, TrendingUp, ArrowRight, Search, User } from "lucide-react";

// 더미 데이터
const DUMMY_USER_NAME = "한지훈";
const DUMMY_MONTHLY_TIME = 210;
const DUMMY_MONTHLY_COUNT = 6;
const DUMMY_RECENT_REPORTS = [
  {
    id: "rpt_1",
    title: "학부모 상담 - 김OO",
    date: "2026.01.11",
    duration: "32:12",
  },
  {
    id: "rpt_2",
    title: "학생 상담 - 이OO",
    date: "2026.01.10",
    duration: "18:05",
  },
  {
    id: "rpt_3",
    title: "성적 점검 - 박OO",
    date: "2026.01.08",
    duration: "45:20",
  },
];

export default function TestHomePage() {
  return (
    <AppShell showBottomNav={false}>
      <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-orange-50/30">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-orange-100/50">
          <div className="max-w-[480px] mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
                  VoiceNote
                </h1>
                <p className="text-xs text-orange-600/70 mt-0.5">AI Voice Transcription</p>
              </div>
              <div className="flex items-center gap-3">
                <button className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 hover:bg-orange-200 transition-colors">
                  <Search className="w-5 h-5" />
                </button>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white font-semibold shadow-lg shadow-orange-200">
                  {DUMMY_USER_NAME[0]}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-[480px] mx-auto px-6 py-6 space-y-6">
          {/* Welcome Section */}
          <div className="pt-2">
            <h2 className="text-3xl font-bold text-gray-900 mb-1">
              Hello, {DUMMY_USER_NAME}! 👋
            </h2>
            <p className="text-gray-600 text-base">
              Ready to capture your thoughts?
            </p>
          </div>

          {/* Stats Cards - Horizontal Scroll */}
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
            <div className="flex-shrink-0 w-[280px] bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl p-5 text-white shadow-xl shadow-orange-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Clock className="w-6 h-6" />
                </div>
                <TrendingUp className="w-5 h-5 opacity-80" />
              </div>
              <p className="text-white/90 text-sm font-medium mb-2">This Month</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">{DUMMY_MONTHLY_TIME}</span>
                <span className="text-lg opacity-80">min</span>
              </div>
              <p className="text-white/70 text-xs mt-2">Recording time</p>
            </div>

            <div className="flex-shrink-0 w-[280px] bg-gradient-to-br from-amber-500 to-orange-500 rounded-3xl p-5 text-white shadow-xl shadow-orange-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <FileText className="w-6 h-6" />
                </div>
                <TrendingUp className="w-5 h-5 opacity-80" />
              </div>
              <p className="text-white/90 text-sm font-medium mb-2">This Month</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">{DUMMY_MONTHLY_COUNT}</span>
                <span className="text-lg opacity-80">notes</span>
              </div>
              <p className="text-white/70 text-xs mt-2">Total recordings</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-4">
            <Link
              href="/test-recording"
              className="group bg-white rounded-2xl p-5 shadow-sm border border-orange-100 hover:shadow-lg hover:border-orange-200 transition-all active:scale-[0.98]"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-lg shadow-orange-200">
                <Mic className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Start Recording</h3>
              <p className="text-xs text-gray-500">Capture your voice</p>
            </Link>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-orange-100">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center mb-3 shadow-lg shadow-amber-200">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">View Reports</h3>
              <p className="text-xs text-gray-500">Browse history</p>
            </div>
          </div>

          {/* Recent Notes */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Recent Notes</h3>
              <Link href="/home" className="text-sm font-medium text-orange-600 hover:text-orange-700 flex items-center gap-1">
                See all
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {DUMMY_RECENT_REPORTS.map((report) => (
                <Link
                  key={report.id}
                  href={`/reports/${report.id}`}
                  className="block bg-white rounded-2xl p-4 shadow-sm border border-orange-100 hover:shadow-md hover:border-orange-200 transition-all active:scale-[0.98] group"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center group-hover:from-orange-200 group-hover:to-orange-100 transition-colors">
                      <FileText className="w-6 h-6 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 mb-1 truncate group-hover:text-orange-600 transition-colors">
                        {report.title}
                      </h4>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>{report.date}</span>
                        <span className="text-orange-600 font-medium">{report.duration}</span>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-orange-600 transition-colors flex-shrink-0 mt-1" />
                  </div>
                </Link>
              ))}
            </div>
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
                className="flex flex-col items-center gap-1 px-4 py-2 text-orange-600"
              >
                <div className="w-6 h-6 rounded-lg bg-orange-600/10 flex items-center justify-center">
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
                className="flex flex-col items-center gap-1 px-4 py-2 text-gray-500 hover:text-orange-600 transition-colors"
              >
                <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium">Profile</span>
              </Link>
            </div>
          </div>
        </nav>
      </div>
    </AppShell>
  );
}

