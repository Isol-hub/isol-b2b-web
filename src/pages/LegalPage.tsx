import { useParams, useNavigate } from 'react-router-dom'

type Doc = 'terms' | 'privacy'

const LAST_UPDATED = '13 March 2026'
const COMPANY = 'ISOL Studio'
const EMAIL = 'support@isol.live'

/* ── Content ────────────────────────────────────────────────────────────── */

const TERMS: Section[] = [
  {
    title: '1. Acceptance of Terms',
    body: `By accessing or using ${COMPANY} ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, you may not use the Service. These terms apply to all users, including workspace owners and invited team members.`,
  },
  {
    title: '2. Description of Service',
    body: `${COMPANY} provides a real-time speech transcription, translation, and AI-assisted document formatting platform delivered via a web application. The Service processes audio captured directly on your device; no audio is transmitted to or stored on our servers. Transcripts and translated text are processed ephemerally and stored only in your account database upon explicit save action.`,
  },
  {
    title: '3. Account Registration',
    body: `Access to the Service requires a valid email address. Authentication is performed via a one-time passcode (OTP) sent to your email. You are responsible for maintaining the confidentiality of your account and for all activities that occur under it. You agree to provide accurate and complete information and to notify us immediately of any unauthorised use at ${EMAIL}.`,
  },
  {
    title: '4. Acceptable Use',
    body: `You agree not to use the Service to: (a) violate any applicable law or regulation; (b) infringe the intellectual property rights of any third party; (c) transmit any material that is unlawful, defamatory, or harmful; (d) attempt to gain unauthorised access to any part of the Service or its infrastructure; (e) use the Service to process classified, top-secret, or legally privileged information without appropriate authorisation; (f) resell or sublicence access to the Service without our written consent.`,
  },
  {
    title: '5. Subscription Plans and Billing',
    body: `The Service offers free and paid subscription plans. Paid plans are billed via Stripe on a monthly or annual basis. By subscribing, you authorise us to charge your payment method on a recurring basis. Subscriptions automatically renew unless cancelled before the renewal date. No refunds are provided for partial billing periods, except where required by applicable law. We reserve the right to modify pricing with 30 days' notice.`,
  },
  {
    title: '6. Intellectual Property',
    body: `All transcripts, translations, and AI-generated content produced through the Service are owned by you. We claim no ownership over your content. You grant us a limited, non-exclusive licence to process your content solely for the purpose of delivering the Service. The ${COMPANY} platform, software, and branding remain our exclusive intellectual property.`,
  },
  {
    title: '7. Limitation of Liability',
    body: `To the maximum extent permitted by applicable law, ${COMPANY} shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of data, loss of revenue, or loss of profits, arising from your use of or inability to use the Service. Our total liability for any claim arising from these Terms shall not exceed the amount you paid us in the three months preceding the claim.`,
  },
  {
    title: '8. Service Availability',
    body: `We do not guarantee that the Service will be available at all times. The Service may be temporarily unavailable due to maintenance, infrastructure issues, or circumstances beyond our control. We will make reasonable efforts to notify users of planned downtime. No service level agreement (SLA) is provided unless expressly agreed in a separate written contract.`,
  },
  {
    title: '9. Termination',
    body: `Either party may terminate the relationship at any time. You may delete your account at any time from Settings → Danger Zone, which permanently removes all associated data. We reserve the right to suspend or terminate accounts that violate these Terms, with or without notice. Upon termination, your access to the Service will cease immediately.`,
  },
  {
    title: '10. Governing Law',
    body: `These Terms are governed by and construed in accordance with the laws of Italy. Any dispute arising from or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts of Milan, Italy, unless mandatory consumer protection laws in your jurisdiction provide otherwise.`,
  },
  {
    title: '11. Changes to Terms',
    body: `We reserve the right to modify these Terms at any time. We will notify registered users by email at least 14 days before material changes take effect. Continued use of the Service after the effective date constitutes acceptance of the revised Terms.`,
  },
  {
    title: '12. Contact',
    body: `For any questions regarding these Terms, please contact us at ${EMAIL}.`,
  },
]

const PRIVACY: Section[] = [
  {
    title: '1. Data Controller',
    body: `${COMPANY} ("we", "us") is the data controller for personal data processed through this Service. Data Protection Officer: ${EMAIL}.`,
  },
  {
    title: '2. Data We Collect',
    body: `We collect only what is strictly necessary to provide the Service:\n\n• Email address — used solely for authentication (OTP delivery) and account identification.\n• Account content — transcripts and AI-formatted text you explicitly save to your account.\n• Usage metadata — aggregate counters for AI feature usage (endpoint name, monthly count) used for plan enforcement.\n• Billing data — payment details are processed directly by Stripe and are never stored on our servers.\n\nWe do NOT collect, transmit, or store audio. All audio processing occurs locally on your device.`,
  },
  {
    title: '3. How We Use Your Data',
    body: `Your data is used for the following purposes:\n\n• Authentication: to verify your identity via OTP and issue an access token.\n• Service delivery: to store and retrieve your account sessions and transcripts.\n• Billing: to manage your subscription via Stripe.\n• Service improvement: aggregate, anonymised usage statistics to improve performance.\n\nWe do not sell, rent, or share your personal data with third parties for marketing purposes.`,
  },
  {
    title: '4. Audio and Transcription',
    body: `Audio captured via your microphone or screen is processed entirely on your device and transmitted in real-time to our WebSocket transcription infrastructure solely for the purpose of generating text. Audio is never written to disk, never stored in any database, and is discarded immediately after transcription. We retain only the resulting text transcript if you choose to save your session.`,
  },
  {
    title: '5. Legal Basis for Processing (GDPR)',
    body: `We process your personal data under the following legal bases (Article 6 GDPR):\n\n• Contract performance (Art. 6(1)(b)): processing your email and account data to deliver the Service you requested.\n• Legitimate interests (Art. 6(1)(f)): aggregate usage analytics to maintain and improve the Service.\n• Legal obligation (Art. 6(1)(c)): where required by applicable law (e.g. tax and billing records).`,
  },
  {
    title: '6. Data Retention',
    body: `Your email address is retained for as long as your account exists. Account content (sessions, transcripts) is retained until you delete it or delete your account. Authentication OTP codes are automatically deleted after 10 minutes. Rate-limit counters are automatically deleted at midnight UTC daily. Upon workspace deletion, all associated personal data is permanently and irreversibly erased from our systems within 30 days.`,
  },
  {
    title: '7. Your Rights',
    body: `Under GDPR, you have the following rights:\n\n• Right of access: request a copy of all personal data we hold about you.\n• Right to rectification: request correction of inaccurate data.\n• Right to erasure ("right to be forgotten"): delete your account from Settings → Danger Zone. This triggers immediate and permanent deletion of all associated data.\n• Right to data portability: export your account data in JSON format from Settings → Data & Export.\n• Right to object: object to processing based on legitimate interests.\n• Right to lodge a complaint: with the Italian Supervisory Authority (Garante per la Protezione dei Dati Personali, www.garanteprivacy.it).\n\nTo exercise any right, contact us at ${EMAIL}.`,
  },
  {
    title: '8. Third-Party Processors',
    body: `We use the following sub-processors to deliver the Service:\n\n• Cloudflare, Inc. — hosting infrastructure and edge network (USA, EU Standard Contractual Clauses apply).\n• Resend, Inc. — transactional email delivery (authentication codes).\n• Stripe, Inc. — payment processing (billing data never stored by us).\n• Anthropic, PBC — AI text processing (transcript formatting, translation, notes). Text is sent to Anthropic's API under their data processing agreement; audio is never transmitted.\n\nAll processors are bound by data processing agreements that comply with GDPR Chapter V requirements.`,
  },
  {
    title: '9. International Transfers',
    body: `Some of our processors operate outside the European Economic Area (EEA). Where this occurs, transfers are safeguarded by Standard Contractual Clauses (SCCs) approved by the European Commission, or by an adequacy decision.`,
  },
  {
    title: '10. Security',
    body: `We implement appropriate technical and organisational measures to protect your personal data, including: encrypted data in transit (TLS 1.2+), authentication via cryptographically-signed JSON Web Tokens (RS256), rate limiting to prevent brute-force attacks, and access control ensuring each user can only access their own account data.`,
  },
  {
    title: '11. Cookies',
    body: `The Service does not use tracking or analytics cookies. Authentication state is stored in your browser's localStorage as a signed JWT token, which is not a cookie and is not transmitted to any third party.`,
  },
  {
    title: '12. Changes to This Policy',
    body: `We may update this Privacy Policy from time to time. We will notify you by email before material changes take effect. The current version is always available at this URL.`,
  },
  {
    title: '13. Contact and DPO',
    body: `For any privacy-related enquiry or to exercise your rights, contact our Data Protection Officer at ${EMAIL}. We will respond within 30 days.`,
  },
]

/* ── Types ──────────────────────────────────────────────────────────────── */

interface Section {
  title: string
  body: string
}

/* ── Sub-components ─────────────────────────────────────────────────────── */

function SectionBlock({ title, body }: Section) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{
        fontSize: 14, fontWeight: 700, color: 'var(--text)',
        marginBottom: 8, letterSpacing: '-0.01em',
      }}>
        {title}
      </h2>
      <div style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.75 }}>
        {body.split('\n').map((line, i) =>
          line === '' ? <br key={i} /> : <p key={i} style={{ margin: '0 0 6px' }}>{line}</p>
        )}
      </div>
    </div>
  )
}

/* ── Main component ─────────────────────────────────────────────────────── */

export default function LegalPage() {
  const { doc } = useParams<{ doc: Doc }>()
  const navigate = useNavigate()

  const isPrivacy = doc === 'privacy'
  const title = isPrivacy ? 'Privacy Policy' : 'Terms of Service'
  const sections = isPrivacy ? PRIVACY : TERMS

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      fontFamily: 'var(--font-ui)',
    }}>
      {/* ── Top bar ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'var(--canvas)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '0 24px', height: 52,
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', fontSize: 13, fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 5, padding: '4px 0',
          }}
        >
          ← Back
        </button>

        <div style={{ width: 1, height: 16, background: 'var(--divider)' }} />

        {/* Tabs */}
        {(['terms', 'privacy'] as Doc[]).map(d => (
          <button
            key={d}
            onClick={() => navigate(`/legal/${d}`, { replace: true })}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
              color: doc === d ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: doc === d ? '2px solid var(--accent)' : '2px solid transparent',
              padding: '4px 0', marginBottom: -1,
              transition: 'color .15s',
            }}
          >
            {d === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
          </button>
        ))}

        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Updated {LAST_UPDATED}</span>
      </div>

      {/* ── Content ── */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <p style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
            color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 10,
          }}>
            {COMPANY}
          </p>
          <h1 style={{
            fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em',
            color: 'var(--text)', marginBottom: 12, lineHeight: 1.15,
          }}>
            {title}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            {isPrivacy
              ? 'We take your privacy seriously. This policy explains what data we collect, why, and how you can control it.'
              : 'Please read these terms carefully before using the ISOL Studio service.'}
          </p>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--divider)', marginBottom: 36 }} />

        {/* Sections */}
        {sections.map(s => <SectionBlock key={s.title} {...s} />)}

        {/* Footer note */}
        <div style={{
          marginTop: 48, padding: '20px 24px',
          background: 'var(--surface-1)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
        }}>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.65, margin: 0 }}>
            Questions? Contact us at{' '}
            <a href={`mailto:${EMAIL}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>
              {EMAIL}
            </a>
            {' '}— we'll respond within 2 business days.
          </p>
        </div>
      </div>
    </div>
  )
}
