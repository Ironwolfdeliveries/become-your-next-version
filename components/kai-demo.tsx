import { Button } from "./ui";
import { KaiAvatar } from "./kai-avatar";
export function KaiDemo() {
  return (
    <section className="chat kai-status-card" aria-labelledby="kai-example-title">
      <div className="chat-head">
        <KaiAvatar />
        <div>
          <strong id="kai-example-title">Ask Kai</strong>
          <small>Keep Advancing Intentionally</small>
        </div>
      </div>
      <div className="messages">
        <div className="message you">
          <small>You</small>
          <p>Based on my BYNV progress, what should I do next?</p>
        </div>
        <div className="message kai-example-answer">
          <small>Kai</small>
          <p>
            I&apos;ll connect what you&apos;ve saved in BYNV to the most useful action
            you can take now—then help you make that action manageable.
          </p>
        </div>
        <Button href="/create-account">Begin my BYNV journey</Button>
      </div>
      <p className="fine-print">
        Kai uses only permitted BYNV context. Journal entries remain private
        and excluded.
      </p>
    </section>
  );
}
