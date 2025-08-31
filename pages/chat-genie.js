import dynamic from "next/dynamic";

// keep the page clean: just render the screen component
const ChatGenieScreen = dynamic(() => import("../components/ChatGenie/ChatGenieScreen"), {
  ssr: false, // ensures window/sessionStorage checks are safe
});

export default function Page() {
  return <ChatGenieScreen />;
}
