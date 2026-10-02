import { TopBar } from "@/components/layout/TopBar";
import { LeftSidebar } from "@/components/layout/LeftSidebar";
import { RightSidebar } from "@/components/layout/RightSidebar";
import { DesignCanvas } from "@/components/canvas/DesignCanvas";

export default function Home() {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <LeftSidebar />
        <main className="relative min-w-0 flex-1">
          <DesignCanvas />
        </main>
        <RightSidebar />
      </div>
    </div>
  );
}
