import AppShell from "@/components/appshell";
import Card from "@/components/ui/card";
import PageHeader from "@/components/ui/pageheader";

export default function SharePage({
  params,
}: {
  params: { token: string };
}) {
  // BottomNav 없이 단독 레이아웃
  return (
    <AppShell showBottomNav={false}>
      <PageHeader title="상담 보고서" />
      <div className="px-4 py-6">
        <Card className="p-6">
          <div className="text-center py-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              공유된 상담 보고서
            </h2>
            <p className="text-gray-500 mb-4">공유 토큰: {params.token}</p>
            <p className="text-sm text-gray-400">
              공유 페이지 내용은 2단계에서 구현 예정입니다.
            </p>
          </div>
        </Card>

        {/* TODO: 2단계에서 구현할 내용
        - 공유된 보고서 상세 내용 표시
        - 오디오 재생 기능 (공유용)
        - 다운로드 기능 제한 (필요 시)
        */}
      </div>
    </AppShell>
  );
}


