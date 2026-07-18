export const TERMS_VERSION = '2026-07-18';
export const PRIVACY_VERSION = '2026-07-18';

export const LEGAL_EFFECTIVE_DATE = 'July 18, 2026';
export const LEGAL_DRAFT_NOTICE =
  'Draft for legal review before production publication.';

export interface LegalSection {
  id: string;
  title: string;
  paragraphs: readonly string[];
  bullets?: readonly string[];
}

export interface LegalDocument {
  slug: 'terms' | 'privacy';
  title: string;
  shortTitle: string;
  version: string;
  effectiveDate: string;
  introduction: readonly string[];
  sections: readonly LegalSection[];
}

export const TERMS_DOCUMENT = {
  slug: 'terms',
  title: 'Terms of Service',
  shortTitle: 'Terms',
  version: TERMS_VERSION,
  effectiveDate: LEGAL_EFFECTIVE_DATE,
  introduction: [
    'These Terms of Service govern your use of mannan.is and the products, tools, account features, meeting workspaces, content, downloads, and related services provided directly by Mannan Javid (together, the “Services”).',
    'By using the Services, or by selecting “Agree and continue” when creating an account, you agree to these Terms. If you do not agree, do not use the Services.',
  ],
  sections: [
    {
      id: 'scope',
      title: '1. Scope of the Services',
      paragraphs: [
        'The Services may include the portfolio site, Garden writings and curated material, interactive tools and games, downloads, MCP endpoints, contact and scheduling features, payment flows, account-based file access, support material, and meeting workspaces. A feature may have additional terms shown when you use it; those additional terms become part of these Terms for that feature.',
        'Some pages link to projects, platforms, or services operated by others. These Terms govern only Services provided directly by me, not an independent third party’s product or website.',
      ],
    },
    {
      id: 'eligibility',
      title: '2. Eligibility',
      paragraphs: [
        'You must be able to form a binding agreement where you live. The Services are not directed to children under 13. If you are under the age of legal majority where you live, use the Services only with permission from a parent or legal guardian.',
        'If you use the Services for an organization, you represent that you have authority to accept these Terms for that organization.',
      ],
    },
    {
      id: 'accounts',
      title: '3. Accounts and email sign-in',
      paragraphs: [
        'Some features use “Continue with email.” The first successful sign-in link creates an account automatically; the same flow signs you in later. There is no separate password or sign-up form.',
        'You are responsible for controlling the email account used to sign in and for activity under your account. Do not forward sign-in links, impersonate another person, or try to obtain access that was not intended for you. Tell me promptly at hello@mannan.is if you believe your account or email link has been misused.',
      ],
    },
    {
      id: 'meetings-and-content',
      title: '4. Meetings and submitted content',
      paragraphs: [
        'Meeting organizers are responsible for invitations, participant access, the purpose of a meeting, and any notice or consent required for people who participate. A meeting link is an access credential; share it only with intended participants. Do not record, transcribe, or monitor another person without any notice or permission required by law.',
        'You retain ownership of content you intentionally submit, upload, or create through the Services (“User Content”). You give me a limited, non-exclusive license to host, process, reproduce, transmit, and display User Content only as reasonably needed to operate, secure, troubleshoot, and improve the feature you chose.',
        'You represent that you have the rights needed to submit User Content. Do not submit unlawful material, another person’s confidential information without permission, malicious code, or sensitive information that the selected feature is not designed to handle.',
      ],
    },
    {
      id: 'acceptable-use',
      title: '5. Acceptable use',
      paragraphs: ['You may not misuse the Services or help anyone else do so. In particular, you may not:'],
      bullets: [
        'break the law, infringe intellectual-property or privacy rights, threaten people, or distribute harmful or deceptive material;',
        'probe, bypass, disable, or interfere with authentication, access controls, rate limits, security, availability, or another user’s experience;',
        'access accounts, meetings, files, systems, or data without authorization, including by guessing or harvesting links and identifiers;',
        'introduce malware, scrape at abusive volume, overload infrastructure, or use automated access contrary to published instructions;',
        'misrepresent affiliation with me or use the Services to send spam, phishing, or unsolicited commercial messages.',
      ],
    },
    {
      id: 'intellectual-property',
      title: '6. Intellectual property',
      paragraphs: [
        'Except for User Content and third-party material, the Services and their code, design, text, graphics, audiovisual material, and other content are owned by me or my licensors and are protected by applicable law.',
        'You may use the Services for their intended purpose. No other license is granted unless a download, repository, or separate agreement includes one. Feedback may be used without restriction or payment, but I am not required to use it.',
      ],
    },
    {
      id: 'ai-assisted-features',
      title: '7. AI-assisted features',
      paragraphs: [
        'Some features may use automated or AI-assisted systems. Outputs can be incomplete, inaccurate, or unsuitable. Verify important information and use your own judgment before relying on an output, especially for legal, financial, medical, employment, safety, or other consequential decisions.',
        'Do not submit information to an AI-assisted feature unless you are comfortable with it being processed to provide that feature. AI output does not create a professional-client relationship or replace qualified professional advice.',
      ],
    },
    {
      id: 'payments',
      title: '8. Payments',
      paragraphs: [
        'Prices, deliverables, renewal terms, taxes, refund terms, and other purchase details are shown at checkout or in a separate written agreement. By completing a purchase, you authorize the stated charge and agree to those details.',
        'Payments may be processed by Stripe or another identified payment provider under its own terms. I do not receive or store your full payment-card number.',
      ],
    },
    {
      id: 'third-party-services',
      title: '9. Third-party services and links',
      paragraphs: [
        'The Services may rely on or link to third-party infrastructure, embeds, content, payment services, media services, or websites. Their availability and practices are outside my control. Your use of a third-party service is governed by that provider’s terms and privacy policy.',
      ],
    },
    {
      id: 'availability-and-changes',
      title: '10. Availability and changes',
      paragraphs: [
        'The Services are evolving and may change, pause, or end. I may add or remove features, impose reasonable limits, or perform maintenance. I do not promise that every feature or item of content will remain available or that stored content will be retained forever.',
        'Keep your own copy of important material. When reasonably practical, I will try to give notice before discontinuing a material account feature, but urgent security, legal, or operational changes may happen without advance notice.',
      ],
    },
    {
      id: 'suspension-and-termination',
      title: '11. Suspension and termination',
      paragraphs: [
        'You may stop using the Services at any time. I may restrict or suspend access when reasonably necessary to address a Terms violation, security risk, legal requirement, nonpayment, harm to another person, or material threat to the Services.',
        'Sections that by their nature should survive—such as ownership, disclaimers, liability limits, and governing law—remain effective after use ends.',
      ],
    },
    {
      id: 'disclaimers',
      title: '12. Disclaimers',
      paragraphs: [
        'To the extent permitted by law, the Services are provided “as is” and “as available.” I disclaim implied warranties of merchantability, fitness for a particular purpose, title, and non-infringement. I do not warrant uninterrupted or error-free operation, preservation of every item, or that content and outputs will be accurate or fit your needs.',
        'Nothing in these Terms excludes a warranty or consumer right that cannot lawfully be excluded.',
      ],
    },
    {
      id: 'limitation-of-liability',
      title: '13. Limitation of liability',
      paragraphs: [
        'To the extent permitted by law, I will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for lost profits, revenues, goodwill, data, or business opportunities arising from the Services.',
        'To the extent permitted by law, my total liability for all claims relating to the Services will not exceed the greater of the amount you paid me for the affected Service during the 12 months before the event giving rise to the claim or US $100. These limits do not apply where liability cannot lawfully be limited.',
      ],
    },
    {
      id: 'responsibility-for-claims',
      title: '14. Responsibility for claims',
      paragraphs: [
        'If your unlawful use of the Services, your User Content, or your material breach of these Terms causes a third-party claim against me, you agree—where permitted by law—to reimburse reasonable losses, costs, and legal fees resulting from that claim. I will give reasonable notice and allow you to participate in the defense.',
      ],
    },
    {
      id: 'governing-law',
      title: '15. Governing law',
      paragraphs: [
        'These Terms are governed by the laws of the Commonwealth of Virginia, without regard to conflict-of-law rules. Any dispute that cannot be resolved informally will be brought in a state or federal court with jurisdiction in Virginia, unless applicable consumer law gives you the right to bring it elsewhere.',
        'Before filing a claim, please contact hello@mannan.is so we can try to resolve the issue informally. Nothing here prevents either side from seeking urgent injunctive relief or using an eligible small-claims process.',
      ],
    },
    {
      id: 'changes-and-contact',
      title: '16. Changes and contact',
      paragraphs: [
        'I may update these Terms as the Services or legal requirements change. The current version and effective date will appear on this page. If a change materially affects an account feature, I will provide reasonable notice through the Service or by email when appropriate.',
        'Questions about these Terms may be sent to Mannan Javid at hello@mannan.is.',
      ],
    },
  ],
} as const satisfies LegalDocument;

export const PRIVACY_DOCUMENT = {
  slug: 'privacy',
  title: 'Privacy Policy',
  shortTitle: 'Privacy',
  version: PRIVACY_VERSION,
  effectiveDate: LEGAL_EFFECTIVE_DATE,
  introduction: [
    'This Privacy Policy explains how Mannan Javid collects, uses, discloses, and protects personal information when you use mannan.is and the products, tools, account features, meeting workspaces, content, downloads, and related services provided directly by me (together, the “Services”).',
    'What is collected depends on the feature you choose. This policy does not govern an independent third-party site or product merely because the Services link to or embed it.',
  ],
  sections: [
    {
      id: 'account-and-consent-information',
      title: '1. Account and consent information',
      paragraphs: [
        'When you use “Continue with email,” I process your email address, an internal account identifier, account role and status, authentication and session records, and the version and time of any Terms and Privacy acceptance. The first verified sign-in may create an account automatically.',
        'Sign-in links and browser sessions use security credentials. Raw one-time sign-in secrets are not stored after issuance; hashed or signed records are used to verify them.',
      ],
    },
    {
      id: 'meeting-information',
      title: '2. Meeting information',
      paragraphs: [
        'If you use a meeting workspace, I may process the meeting title and schedule, workspace status, participant display names and account or guest identifiers, organizer and access roles, invitations and access-control records, membership history, live-session timing, and operational events needed to provide and secure the meeting.',
        'Meeting organizers and participants decide what they share. Depending on enabled features, meeting content may include text, files, links, audiovisual media, summaries, or other material intentionally submitted to the workspace. A media provider may process live audio or video when that feature is enabled.',
      ],
    },
    {
      id: 'content-you-provide',
      title: '3. Content and information you provide',
      paragraphs: [
        'I process information you intentionally provide through contact forms, scheduling, support requests, feedback, games, files and downloads, interactive tools, MCP requests, account-backed storage, and other features. This can include your name, contact details, messages, prompts, uploads, project information, and the content of your request.',
        'Please do not provide sensitive personal information unless it is necessary for the feature and you understand how that feature works.',
      ],
    },
    {
      id: 'payments',
      title: '4. Payments and transactions',
      paragraphs: [
        'If you make a purchase, I may receive transaction details such as the item or service, amount, currency, payment status, customer contact details, and provider transaction identifier. Stripe processes payment-card information. I do not receive or store your full card number.',
      ],
    },
    {
      id: 'automatic-information',
      title: '5. Device, usage, and operational information',
      paragraphs: [
        'When you use the Services, systems may automatically receive an IP address, request time, browser and device information, referring page, pages or features used, performance measurements, cookie or session identifiers, rate-limit state, and diagnostic or security events.',
        'Vercel Analytics and Speed Insights may provide aggregated usage and performance information. Cloudflare may process network, security, request, and storage data. Some features use Upstash for rate limiting or short-lived application state.',
      ],
    },
    {
      id: 'how-information-is-used',
      title: '6. How information is used',
      paragraphs: ['I use personal information to:'],
      bullets: [
        'provide, personalize, maintain, and troubleshoot the feature you requested;',
        'authenticate accounts, preserve requested navigation, manage meeting and file access, and complete transactions;',
        'send transactional email such as a Resend sign-in link or a reply you requested;',
        'protect people and the Services, prevent abuse, enforce limits, investigate incidents, and comply with law;',
        'understand reliability and feature usage, improve the Services, and communicate material service or policy changes.',
      ],
    },
    {
      id: 'ai-and-automated-processing',
      title: '7. AI and automated processing',
      paragraphs: [
        'An AI-assisted feature may send the prompt, relevant context, and necessary technical data to a model provider such as OpenRouter so the requested output can be generated. Do not submit confidential or sensitive information to an AI feature unless you are comfortable with that processing.',
        'I do not use solely automated processing through these Services to make legal or similarly significant decisions about you.',
      ],
    },
    {
      id: 'how-information-is-shared',
      title: '8. How information is shared',
      paragraphs: [
        'I disclose personal information only as reasonably needed to provide the Services, follow your direction, protect rights and safety, complete a business transaction, or comply with law. Depending on the feature, service providers may include Cloudflare for network, compute, databases, storage, and security; Vercel for site hosting, analytics, and performance; Resend for transactional email; Stripe for payment processing; Upstash for rate limiting or data services; OpenRouter and selected model providers for AI-assisted features; and providers of embedded media or content.',
        'Meeting information and User Content may be visible to the organizer and other authorized participants according to the meeting’s access settings. Information you intentionally submit to a public or shared feature may be seen by its intended audience.',
        'Providers process information under their own agreements and privacy terms. I may also disclose information if reasonably necessary to comply with legal process, investigate fraud or abuse, protect a person’s safety or rights, or support a merger, financing, acquisition, reorganization, or sale of relevant assets.',
      ],
    },
    {
      id: 'no-sale-or-targeted-advertising',
      title: '9. No sale or targeted advertising',
      paragraphs: [
        'We do not sell personal information. I do not share personal information for cross-context behavioral advertising, use the Services to serve targeted advertising, or use personal information to profile people for decisions that produce legal or similarly significant effects.',
      ],
    },
    {
      id: 'retention',
      title: '10. Retention',
      paragraphs: [
        'I retain personal information for as long as reasonably needed for the feature, account, transaction, meeting workspace, security purpose, dispute, or legal obligation for which it was collected. The period varies by the type of information, whether an account or workspace remains active, the sensitivity of the data, operational backup cycles, and applicable requirements.',
        'One-time sign-in and exchange records expire quickly. Some account, consent, transaction, access-control, security, and meeting-history records may be kept longer to maintain integrity, document choices, prevent abuse, resolve disputes, or meet legal obligations. When information is no longer reasonably needed, I may delete, aggregate, or de-identify it.',
      ],
    },
    {
      id: 'security',
      title: '11. Security',
      paragraphs: [
        'I use administrative, technical, and organizational safeguards appropriate to the nature of the Services, such as limited-access credentials, secure and HTTP-only cookies, short-lived one-time links, hashed secrets, access controls, rate limits, and encrypted network connections where supported.',
        'No internet service can guarantee absolute security. Protect access to your email account, do not forward sign-in or meeting links, and contact hello@mannan.is if you believe information or an account has been compromised.',
      ],
    },
    {
      id: 'choices-and-rights',
      title: '12. Your choices and privacy rights',
      paragraphs: [
        'You can choose not to provide information, although a requested feature may then be unavailable. You may sign out, decline a meeting invitation, limit what you submit, or contact me to ask about your personal information or account.',
        'Depending on where you live, you may have rights to confirm processing; access, correct, delete, or obtain a portable copy of personal information; opt out of sale, targeted advertising, or certain profiling; and appeal a refusal of a request. Because the Services do not currently sell personal information or use it for targeted advertising or significant-decision profiling, those opt-outs may not change current processing.',
        'Send a request or appeal to hello@mannan.is. I may need to verify your identity and authority before acting. Rights can be subject to legal exceptions, and I will explain a denial where required. You may also complain to the privacy or consumer-protection authority where you live.',
      ],
    },
    {
      id: 'international-processing',
      title: '13. International processing',
      paragraphs: [
        'The Services and their providers may process information in the United States and other countries. Those locations may have privacy laws different from those where you live. Where required, appropriate legal mechanisms are used for cross-border processing.',
      ],
    },
    {
      id: 'children',
      title: '14. Children',
      paragraphs: [
        'The Services are not directed to children under 13, and I do not knowingly collect personal information from a child under 13 through the Services. If you believe a child has provided personal information, contact hello@mannan.is so I can review and take appropriate action.',
      ],
    },
    {
      id: 'third-party-services',
      title: '15. Third-party services',
      paragraphs: [
        'A link, embed, integration, or independent product may be governed by another provider’s privacy policy. Review that provider’s information before using it. This policy covers only Services provided directly by me.',
      ],
    },
    {
      id: 'changes-and-contact',
      title: '16. Changes and contact',
      paragraphs: [
        'I may update this policy as the Services or legal requirements change. The current version and effective date will appear on this page. If a change materially affects an account feature, I will provide reasonable notice through the Service or by email when appropriate.',
        'Questions, privacy requests, and appeals may be sent to Mannan Javid at hello@mannan.is.',
      ],
    },
  ],
} as const satisfies LegalDocument;
