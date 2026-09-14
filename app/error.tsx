"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <section className="container page-hero"><h1>Your progress is still yours.</h1><p>We couldn’t load this page right now. Retry without resetting your account or saved answers.</p><button className="button" onClick={reset}>Try again</button></section>;
}
