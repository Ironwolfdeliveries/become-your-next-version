import { Button } from "./ui";
import { KaiAvatar } from "./kai-avatar";
export function KaiDemo() {
  return (
    <section className="chat kai-status-card">
      <div className="chat-head">
        <KaiAvatar />
        <div>
          <strong>Kai</strong>
          <small>Guided navigator + controlled Live Kai Beta</small>
        </div>
        <div className="message">
          <small>Live Beta · approved members</small>
          <p>
            Approved beta members can receive personalized conversation. If a
            safety, access, or budget control stops a model request, Guided Kai
            remains available automatically.
          </p>
        </div>
      </div>
      <div className="messages">
        <div className="message">
          <small>Kai</small>
          <p>
            Your saved Snapshot, Architect Assessment, Blueprint, Daily Focus,
            goals, cycles, and challenges help me connect this page to a useful
            next action.
          </p>
        </div>
        <div className="message">
          <small>Guided mode · available now</small>
          <p>
            I use BYNV rules and permitted account context without calling a
            paid generative model. When a task benefits from open-ended AI, I
            build a portable prompt for ChatGPT, Claude, Gemini, or another
            assistant you choose.
          </p>
        </div>
        <Button href="/daily-focus">Open my Daily OS</Button>
      </div>
      <p className="fine-print">
        Kai is not professional or crisis support. Assessment guidance never
        recommends a response. Journal entries are excluded.
      </p>
    </section>
  );
}
