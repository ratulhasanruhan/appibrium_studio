import { Topbar } from "@/components/topbar";
import { ChatInterface } from "@/modules/assistant/chat-interface";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "AI Assistant · Appibrium Studio" };

export default function AssistantPage() {
  return (
    <>
      <Topbar title="AI Assistant" subtitle="Draft technical scopes, contract details, and copy powered by Qwen AI" />
      <div className="page-content">
        <ChatInterface />
      </div>
    </>
  );
}
