import { LegalShell } from "./Legal";

/**
 * PRIVACY POLICY — grounded in what Node actually collects (verified against
 * the codebase on September 13, 2026):
 *  - Convex Auth (email-OTP and anonymous sessions): name, email, image, role
 *  - Design files, version history, projects, folders (Convex cloud database)
 *  - Published files (Explore): name, description, tags, author display name
 *  - Comments and real-time presence (cursor position, selection)
 *  - AI assistant ("Vector"): chat messages + document context sent to the
 *    configured LLM provider (server key: Groq; or the user's own key for
 *    Groq/OpenRouter/OpenAI/Anthropic) — proxied through a Convex action
 *  - Browser storage: localStorage (theme, canvas preference, AI settings)
 *    and IndexedDB ("node-designs") for device-local file saves
 *  - No third-party advertising, no sale of data, no third-party analytics
 */
export default function Privacy() {
  return (
    <LegalShell title="Privacy Policy" updated="September 13, 2026">
      <p>
        This Privacy Policy explains how Node ("Node", "we", "us") handles
        information when you use the Node web application at this site,
        including the design editor, dashboard, Explore catalog, and the
        Vector AI assistant (collectively, the "Service"). By using the
        Service, you acknowledge the practices described here. If you do not
        agree, do not use the Service.
      </p>

      <h2>1. Summary</h2>
      <p>
        Node stores your account details and design files in a cloud database
        operated by Convex and, at your choice, on your own device. When you
        use the Vector AI assistant, the text you type and a summary of your
        current design are sent to an AI provider to generate edits. We do not
        sell your personal data, we do not run third-party advertising or
        analytics scripts, and we collect only the data listed below.
      </p>

      <h2>2. Who is responsible (data controller)</h2>
      <p>
        The Service is operated by the Node project. For privacy questions,
        deletion requests, or complaints, contact the operator through the
        account-deletion feature in the app (Settings → account menu → Delete
        account) or by publishing an issue on the project's public repository.
        We will respond to verified requests within 30 days.
      </p>

      <h2>3. Data we collect</h2>
      <h3>3.1 Account data (Convex Auth)</h3>
      <ul>
        <li>
          <strong>Email address</strong> — collected when you sign in with an
          emailed one-time code. Used to authenticate you and deliver the
          sign-in code.
        </li>
        <li>
          <strong>Display name</strong> — shown to collaborators and, if you
          publish a design, in the Explore catalog.
        </li>
        <li>
          <strong>Profile image (optional)</strong> — shown as your avatar to
          collaborators.
        </li>
        <li>
          <strong>Anonymous sessions</strong> — if you use the Service without
          signing in, an anonymous account identifier is created. No email is
          collected for such sessions.
        </li>
        <li>
          <strong>Session records</strong> — authentication sessions and
          refresh tokens are stored to keep you signed in.
        </li>
      </ul>
      <h3>3.2 Design content</h3>
      <ul>
        <li>
          <strong>Design files</strong> — the documents you create (frames,
          shapes, text, images you insert, layout data) are stored in the
          cloud database with a version number, and are additionally saved to
          your device (see §3.6). You can also export your documents as JSON,
          PNG, or generated code.
        </li>
        <li>
          <strong>Projects and folders</strong> — organizational metadata
          (names, creation dates, folder membership).
        </li>
        <li>
          <strong>Version history</strong> — snapshots of documents ("doc
          versions") are retained so you can restore earlier states.
        </li>
        <li>
          <strong>Comments</strong> — comment text, position, author, and
          resolved status on files you have access to.
        </li>
      </ul>
      <h3>3.3 Real-time collaboration (presence)</h3>
      <ul>
        <li>
          While a file is open, your display name, avatar color, live cursor
          position, and current selection are shared in real time with other
          people viewing that same file. Presence records are tied to your
          session and are removed when you leave the file or when you delete
          your account.
        </li>
      </ul>
      <h3>3.4 Published content (Explore)</h3>
      <ul>
        <li>
          If you publish a design to the Explore catalog, the following become
          publicly visible to anyone: the file name, an optional description,
          tags, the author display name, the publication date, and a preview
          thumbnail of the design. Publishing is opt-in and reversible via
          "Unpublish".
        </li>
      </ul>
      <h3>3.5 Vector AI assistant</h3>
      <ul>
        <li>
          When you send a message to Vector, the following are transmitted to
          the configured AI provider: (a) your chat messages, (b) a
          machine-readable summary of the current page of your design (layer
          names, node types, ids, positions, sizes) and your current
          selection, and (c) recent conversation turns for continuity.
        </li>
        <li>
          <strong>Default provider:</strong> Groq (Groq LLC). Requests are
          proxied through our backend action so your provider key — if you
          supply a personal one — is never exposed to other users. Provider
          privacy policies:{" "}
          <a href="https://groq.com/privacy-policy/" target="_blank" rel="noreferrer noopener">
            Groq Privacy Policy
          </a>
          . If you select a different provider in Vector's settings (OpenRouter,
          OpenAI, or Anthropic), your messages are sent to that provider
          instead and are governed by that provider's policy.
        </li>
        <li>
          <strong>Provider API keys:</strong> if you paste your own provider
          key into Vector's settings, it is stored only in your browser's
          localStorage and sent only to our backend action for the duration of
          each request. We do not store provider keys in the cloud database.
        </li>
        <li>
          Vector is instructed to treat your design content as data, to refuse
          attempts to override its behavior, and to produce only design edits.
          Do not include personal data in design content or prompts you do not
          want processed by the AI provider.
        </li>
      </ul>
      <h3>3.6 Data stored on your device</h3>
      <ul>
        <li>
          <strong>localStorage</strong> — app preferences: theme mode
          ("light"/"dark"), canvas surface preference, and your Vector
          settings (provider choice, model, and API key if you entered one).
          Clearing site data removes these.
        </li>
        <li>
          <strong>IndexedDB</strong> — copies of design files you save
          ("node-designs" database). These stay on your device; they are not
          transmitted to us unless the file is also synced to the cloud as
          part of normal editing.
        </li>
      </ul>
      <h3>3.7 Data we do not collect</h3>
      <ul>
        <li>
          We do not collect payment information (the Service has no paid
          tier).
        </li>
        <li>We do not run third-party advertising or ad trackers.</li>
        <li>
          We do not embed third-party web analytics or session-replay scripts.
        </li>
        <li>We do not sell or rent personal information.</li>
        <li>
          We do not knowingly collect data from children under 13 (and under
          16 in the EEA/UK); if you believe a child has provided personal
          data, contact us so it can be deleted.
        </li>
      </ul>

      <h2>4. Service providers (subprocessors)</h2>
      <ul>
        <li>
          <strong>Convex (Convex, Inc.)</strong> — hosts the backend database,
          authentication, and server functions that power the Service.
          Convex's handling of data is described in the{" "}
          <a href="https://www.convex.dev/legal/privacy" target="_blank" rel="noreferrer noopener">
            Convex Privacy Policy
          </a>
          . Convex states it complies with the GDPR in delivering its service.
        </li>
        <li>
          <strong>AI providers</strong> — Groq (and, if you choose them,
          OpenRouter, OpenAI, or Anthropic) process AI requests as described
          in §3.5.
        </li>
        <li>
          <strong>Hosting and delivery of the web application itself</strong>{" "}
          (static assets) is performed by the platform serving this site.
        </li>
      </ul>
      <p>
        A current list of subprocessors is available on request via the
        contact channel in §2.
      </p>

      <h2>5. Legal bases (EEA/UK users)</h2>
      <ul>
        <li>
          <strong>Contract (GDPR Art. 6(1)(b))</strong> — processing account
          data, design content, presence, and comments to provide the Service
          you request.
        </li>
        <li>
          <strong>Legitimate interests (Art. 6(1)(f))</strong> — securing the
          Service, maintaining version history, and preventing abuse.
        </li>
        <li>
          <strong>Consent (Art. 6(1)(a))</strong> — sending your design
          context and prompts to an AI provider when you use Vector; you may
          withdraw consent at any time simply by not using Vector. Publishing
          a design to Explore is also consent-based and revocable by
          unpublishing.
        </li>
      </ul>

      <h2>6. Retention</h2>
      <ul>
        <li>
          Account data and design content are retained while your account is
          active.
        </li>
        <li>
          Trashed files remain until you empty them or delete your account.
        </li>
        <li>
          Version-history snapshots are retained for files while they exist;
          deleting a file deletes its snapshots.
        </li>
        <li>
          Deleting your account (Settings → Delete account) permanently
          deletes: your presence records, all your files including version
          history and comments, your projects and folders, your authentication
          sessions and refresh tokens (signing you out everywhere), and your
          user record. This is irreversible.
        </li>
        <li>
          Device-local data (localStorage, IndexedDB) persists until you clear
          it in your browser or delete the relevant files in the app.
        </li>
      </ul>

      <h2>7. Your rights</h2>
      <p>Depending on your jurisdiction, you may have the right to:</p>
      <ul>
        <li>Access and obtain a copy of your data (use the JSON export in the editor, or contact us);</li>
        <li>Rectify inaccurate data (edit your name and profile fields in the app);</li>
        <li>Erase your data (delete files, unpublish designs, or delete your account entirely);</li>
        <li>Object to or restrict certain processing;</li>
        <li>Data portability (JSON export);</li>
        <li>Withdraw consent (stop using Vector; unpublish designs);</li>
        <li>
          Lodge a complaint with your local supervisory authority (EEA/UK) or
          state attorney general (US states with comprehensive privacy laws,
          e.g. the California Attorney General).
        </li>
      </ul>
      <p>
        California residents: we do not "sell" or "share" personal information
        as defined by the CCPA/CPRA, and we do not use personal information
        for cross-context behavioral advertising.
      </p>

      <h2>8. International transfers</h2>
      <p>
        Your data is processed in the regions where Convex and the AI
        providers operate their infrastructure, which may be outside your
        country of residence. Where required, transfers rely on appropriate
        safeguards such as the European Commission's Standard Contractual
        Clauses offered by our subprocessors.
      </p>

      <h2>9. Security</h2>
      <ul>
        <li>
          Transport encryption (HTTPS/TLS) is used for all client-server
          communication.
        </li>
        <li>
          Access to design files and projects is scoped to the owning account
          on the backend; published designs are public by design.
        </li>
        <li>
          Provider API keys are stored server-side as environment secrets (or
          only in your browser, for personal keys) and are never returned to
          clients.
        </li>
        <li>
          No system is perfectly secure; please use a strong, unique email
          account and tell us promptly about any suspected vulnerability.
        </li>
      </ul>

      <h2>10. Children</h2>
      <p>
        The Service is not directed to children under 13 (or under 16 in the
        EEA/UK), and we do not knowingly collect their personal data. If you
        believe a child has created an account with personal data, contact us
        so we can delete it.
      </p>

      <h2>11. Changes to this policy</h2>
      <p>
        We may update this policy as the Service evolves. Material changes
        will be reflected by updating the "Last updated" date above, and we
        will provide additional notice in the app for changes that reduce your
        protections.
      </p>

      <h2>12. Contact</h2>
      <p>
        Privacy questions, data-subject requests, and subprocessor lists:
        contact the Node operator via the in-app account menu or the project's
        public repository. We aim to respond within 30 days.
      </p>
    </LegalShell>
  );
}
