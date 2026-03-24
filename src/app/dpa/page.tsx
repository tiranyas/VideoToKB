import Link from 'next/link';
import { Shield, Database, Globe, Users, Bell, Search, Clock, Scale, Server, Brain, FileText, Trash2 } from 'lucide-react';

export const metadata = {
  title: 'Data Processing Agreement - KBPipe',
  description: 'How KBPipe processes and protects your data as a processor under GDPR and US privacy laws.',
};

function Section({
  icon: Icon,
  title,
  id,
  children,
}: {
  icon: React.ElementType;
  title: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100">
          <Icon className="h-4.5 w-4.5 text-gray-600" />
        </div>
        <h2 className="text-lg font-semibold tracking-tight text-gray-900">{title}</h2>
      </div>
      <div className="pl-12 space-y-3 text-sm leading-relaxed text-gray-600">{children}</div>
    </section>
  );
}

function TableRow({ cells, header = false }: { cells: string[]; header?: boolean }) {
  const Tag = header ? 'th' : 'td';
  return (
    <tr className={header ? 'border-b border-gray-200' : 'border-b border-gray-100 last:border-0'}>
      {cells.map((cell, i) => (
        <Tag
          key={i}
          className={`px-3 py-2 text-left text-sm ${header ? 'font-medium text-gray-700' : 'text-gray-600'} ${i === 0 ? 'font-medium' : ''}`}
        >
          {cell}
        </Tag>
      ))}
    </tr>
  );
}

export default function DPAPage() {
  return (
    <div className="flex min-h-screen items-start justify-center bg-gray-50/50 px-4 py-16">
      <div className="w-full max-w-3xl">
        <div className="rounded-2xl bg-white shadow-xl shadow-gray-200/50 p-8 sm:p-10 space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
              Data Processing Agreement
            </h1>
            <p className="text-sm text-gray-400">Last updated: March 24, 2026</p>
            <p className="text-sm text-gray-500 max-w-lg mx-auto mt-3">
              This DPA governs how KBPipe processes personal data on behalf of its customers,
              in compliance with GDPR, CCPA/CPRA, and applicable US state privacy laws.
            </p>
          </div>

          <div className="border-t border-gray-100" />

          {/* Table of contents */}
          <nav className="rounded-xl bg-gray-50 p-5 space-y-1.5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Contents</p>
            {[
              ['definitions', 'Definitions'],
              ['scope', 'Scope & Nature of Processing'],
              ['controller', 'Controller Obligations'],
              ['processor', 'Processor Obligations & Security'],
              ['rights', 'Data Subject & Consumer Rights'],
              ['transfers', 'International Data Transfers'],
              ['subprocessors', 'Sub-processors'],
              ['ai-training', 'AI Model Training'],
              ['breach', 'Breach Notification'],
              ['audit', 'Audit Rights'],
              ['retention', 'Data Retention & Deletion'],
              ['liability', 'Liability & Governing Law'],
            ].map(([id, label], i) => (
              <a key={id} href={`#${id}`} className="block text-sm text-gray-500 hover:text-gray-900 transition-colors">
                {i + 1}. {label}
              </a>
            ))}
          </nav>

          {/* 1. Definitions */}
          <Section icon={FileText} title="1. Definitions" id="definitions">
            <ul className="space-y-2">
              <li><strong>&ldquo;Controller&rdquo; / &ldquo;Business&rdquo;</strong> &mdash; The KBPipe customer (the organization subscribing to the service).</li>
              <li><strong>&ldquo;Processor&rdquo; / &ldquo;Service Provider&rdquo;</strong> &mdash; KBPipe, the entity operating the video-to-article pipeline.</li>
              <li><strong>&ldquo;Data Subject&rdquo; / &ldquo;Consumer&rdquo;</strong> &mdash; Any individual whose personal data is processed through the service.</li>
              <li><strong>&ldquo;Personal Data&rdquo;</strong> &mdash; Any information relating to an identified or identifiable person submitted to or processed by KBPipe.</li>
              <li><strong>&ldquo;Processing&rdquo;</strong> &mdash; Any operation performed on personal data, including transcription, AI article generation, and storage.</li>
              <li><strong>&ldquo;Sub-processor&rdquo;</strong> &mdash; A third party engaged by KBPipe to process personal data on its behalf.</li>
              <li><strong>&ldquo;Applicable Privacy Law&rdquo;</strong> &mdash; GDPR (EU 2016/679), CCPA/CPRA (Cal. Civ. Code &sect;1798.100 et seq.), and any substantially equivalent US state privacy law in force (VA CDPA, CO CPA, TX TDPSA, CT CTDPA, etc.).</li>
            </ul>
          </Section>

          {/* 2. Scope */}
          <Section icon={Database} title="2. Scope & Nature of Processing" id="scope">
            <p className="font-medium text-gray-700">Data that is processed:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Video URLs</strong> &mdash; links submitted by the Controller for transcription</li>
              <li><strong>Audio streams</strong> &mdash; fetched from video URLs, processed entirely in memory, never written to disk or stored</li>
              <li><strong>Transcripts</strong> &mdash; generated from audio, held in memory during processing only, discarded after pipeline completion</li>
              <li><strong>Generated articles</strong> &mdash; stored in the database, scoped to the Controller&apos;s workspace</li>
              <li><strong>Account data</strong> &mdash; email address, workspace name, company context</li>
              <li><strong>API keys</strong> &mdash; stored as SHA-256 hashes only; raw keys are never recoverable</li>
            </ul>

            <div className="rounded-xl bg-green-50 border border-green-100 p-4 mt-3">
              <p className="font-medium text-green-800 text-sm">Data NOT stored by KBPipe:</p>
              <ul className="list-disc pl-5 space-y-1 text-green-700 mt-1">
                <li>Raw video or audio files are never persisted</li>
                <li>Transcripts are deleted immediately after article generation</li>
                <li>No biometric data, payment data, government IDs, or health information is collected</li>
              </ul>
            </div>

            <p className="mt-2">
              <strong>Purpose limitation:</strong> Personal data is processed solely to provide the KBPipe service.
              No secondary use, no profiling, no targeted advertising.
            </p>
            <p>
              <strong>Processing method:</strong> Fully automated with no human review of video content or transcripts.
            </p>
          </Section>

          {/* 3. Controller Obligations */}
          <Section icon={Users} title="3. Controller Obligations" id="controller">
            <p>As the Controller, you are responsible for:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Having a lawful basis under GDPR Art. 6 for submitting data to KBPipe</li>
              <li>Obtaining necessary consents from individuals appearing in submitted videos</li>
              <li>Ensuring submitted videos do not contain special category data (health, biometric, political opinions) unless expressly agreed in writing</li>
              <li>Providing privacy notices to data subjects and responding to data subject requests</li>
              <li>Ensuring video URLs are either publicly accessible with the data subject&apos;s knowledge, or shared internally within the Controller&apos;s organization</li>
            </ul>
          </Section>

          {/* 4. Processor Obligations & Security */}
          <Section icon={Shield} title="4. Processor Obligations & Security" id="processor">
            <p><strong>Instruction compliance (GDPR Art. 28(3)(a)):</strong> KBPipe processes personal data only on documented instructions from the Controller. If an instruction appears to violate Applicable Privacy Law, KBPipe will notify the Controller before proceeding.</p>

            <p><strong>Confidentiality (GDPR Art. 28(3)(b)):</strong> Personnel with access to personal data are bound by confidentiality obligations. Access is restricted on a need-to-know basis.</p>

            <p className="font-medium text-gray-700 mt-3">Technical & Organizational Measures:</p>
            <div className="overflow-x-auto rounded-xl border border-gray-100 mt-1">
              <table className="w-full text-sm">
                <thead>
                  <TableRow header cells={['Measure', 'Implementation']} />
                </thead>
                <tbody>
                  <TableRow cells={['Data minimization', 'Audio and transcripts exist only in memory; never stored']} />
                  <TableRow cells={['Encryption in transit', 'TLS 1.2+ enforced on all connections']} />
                  <TableRow cells={['Encryption at rest', 'AES encryption via AWS/Supabase infrastructure']} />
                  <TableRow cells={['Access control', 'Row-Level Security (RLS) isolates each workspace']} />
                  <TableRow cells={['Authentication', 'Supabase Auth with email/password and Google OAuth']} />
                  <TableRow cells={['API authorization', 'SHA-256 hashed bearer tokens; raw keys never stored']} />
                  <TableRow cells={['Network security', 'SSRF protection, rate limiting on all endpoints']} />
                  <TableRow cells={['Workspace isolation', 'Database-level RLS policies prevent cross-tenant access']} />
                </tbody>
              </table>
            </div>
          </Section>

          {/* 5. Data Subject Rights */}
          <Section icon={Search} title="5. Data Subject & Consumer Rights" id="rights">
            <p><strong>GDPR rights (Art. 15&ndash;22):</strong> KBPipe will provide reasonable technical assistance to the Controller to fulfill access, rectification, erasure, restriction, portability, and objection requests within 5 business days.</p>

            <p><strong>Self-service deletion:</strong> Users can delete their account through Settings, which permanently removes all articles, workspaces, preferences, API keys, and the authentication record. Deletion is immediate and irreversible.</p>

            <p className="font-medium text-gray-700 mt-3">CCPA/CPRA Compliance:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>KBPipe does <strong>not sell or share</strong> personal information as defined by CCPA &sect;1798.140</li>
              <li>KBPipe processes personal information solely as a &ldquo;Service Provider&rdquo; under CCPA &sect;1798.140(ag)</li>
              <li>KBPipe will not retain, use, or disclose personal information for any commercial purpose other than providing the contracted service</li>
              <li>KBPipe certifies it understands and will comply with the restrictions of CCPA &sect;1798.140(ag)</li>
            </ul>

            <p className="mt-2"><strong>US state privacy laws (VA CDPA, CO CPA, TX TDPSA, CT CTDPA):</strong> KBPipe treats all personal data in compliance with equivalent processor obligations under applicable US state laws. KBPipe does not engage in profiling or targeted advertising using Controller data.</p>
          </Section>

          {/* 6. Data Transfers */}
          <Section icon={Globe} title="6. International Data Transfers" id="transfers">
            <p>All data is stored and processed in the <strong>United States</strong> (Supabase on AWS; Vercel serverless functions).</p>
            <p>For EU/EEA Controllers, data transfers are governed by the <strong>Standard Contractual Clauses (SCCs)</strong> per EU Commission Decision 2021/914, Module 2 (Controller-to-Processor), incorporated by reference into this DPA.</p>
            <p>In any conflict between this DPA and the SCCs, the SCCs prevail. Each sub-processor is bound by equivalent transfer mechanisms.</p>
          </Section>

          {/* 7. Sub-processors */}
          <Section icon={Server} title="7. Sub-processors" id="subprocessors">
            <p>KBPipe engages the following sub-processors:</p>
            <div className="overflow-x-auto rounded-xl border border-gray-100 mt-1">
              <table className="w-full text-sm">
                <thead>
                  <TableRow header cells={['Service', 'Purpose', 'Data Processed', 'Location']} />
                </thead>
                <tbody>
                  <TableRow cells={['AssemblyAI', 'Audio transcription', 'Audio stream (in-flight only)', 'US']} />
                  <TableRow cells={['Anthropic (Claude)', 'AI article generation', 'Transcript text as prompt input', 'US']} />
                  <TableRow cells={['Supabase (AWS)', 'Database & auth', 'Account data, articles, API key hashes', 'US']} />
                  <TableRow cells={['Vercel', 'Hosting & serverless', 'Request data, transient logs', 'US']} />
                </tbody>
              </table>
            </div>

            <p className="mt-3"><strong>Key data flow notes:</strong></p>
            <ul className="list-disc pl-5 space-y-1">
              <li>AssemblyAI receives only the audio stream, not raw video files</li>
              <li>Anthropic receives only transcript text to generate articles; not the original video or audio</li>
              <li>No sub-processor stores raw video content</li>
            </ul>

            <p className="mt-2"><strong>Change notification:</strong> KBPipe will provide at least 30 days&apos; prior written notice of any addition or replacement of sub-processors. Controllers may object in writing within 14 days; unresolved objections entitle the Controller to terminate without penalty.</p>
          </Section>

          {/* 8. AI Model Training */}
          <Section icon={Brain} title="8. AI Model Training" id="ai-training">
            <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
              <p className="font-medium text-blue-800 text-sm">Zero training guarantee</p>
              <ul className="list-disc pl-5 space-y-1 text-blue-700 mt-2 text-sm">
                <li>KBPipe does <strong>not</strong> use any Controller data to train, fine-tune, or improve any AI model</li>
                <li>All API calls to Anthropic are made via the standard API; Controller data is not fed into any training pipeline</li>
                <li>Anthropic does not use API inputs for model training</li>
                <li>AssemblyAI does not use API inputs for model training</li>
                <li>This prohibition applies to all current and future sub-processors</li>
              </ul>
            </div>
          </Section>

          {/* 9. Breach Notification */}
          <Section icon={Bell} title="9. Breach Notification" id="breach">
            <p>KBPipe will notify the Controller of any confirmed personal data breach without undue delay, and no later than <strong>72 hours</strong> after becoming aware.</p>
            <p>Notification will include:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Nature of the breach</li>
              <li>Categories and approximate number of affected records</li>
              <li>Likely consequences</li>
              <li>Measures taken or proposed to mitigate</li>
            </ul>
            <p className="mt-2"><strong>Scope limitation:</strong> Because audio and transcripts are never stored, a database breach cannot expose raw video content or transcripts &mdash; only stored articles and account data.</p>
          </Section>

          {/* 10. Audit Rights */}
          <Section icon={Search} title="10. Audit Rights" id="audit">
            <p>Per GDPR Art. 28(3)(h), KBPipe will make available all information necessary to demonstrate compliance with this DPA.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Controllers may conduct or commission audits with at least 30 days&apos; written notice</li>
              <li>Audits are limited to once per calendar year, at Controller&apos;s cost</li>
              <li>KBPipe may satisfy audit requests by providing written questionnaire responses or third-party security assessments in lieu of on-site audit</li>
            </ul>
          </Section>

          {/* 11. Data Retention */}
          <Section icon={Trash2} title="11. Data Retention & Deletion" id="retention">
            <div className="overflow-x-auto rounded-xl border border-gray-100 mt-1">
              <table className="w-full text-sm">
                <thead>
                  <TableRow header cells={['Data Type', 'Retention']} />
                </thead>
                <tbody>
                  <TableRow cells={['Audio streams', 'In-memory only (~2-4 min); never stored']} />
                  <TableRow cells={['Transcripts', 'In-memory only; discarded after article generation']} />
                  <TableRow cells={['Generated articles', 'Until user deletes or account deletion']} />
                  <TableRow cells={['Account data', 'Until account deletion (immediate, irreversible)']} />
                  <TableRow cells={['API key hashes', 'Until key revocation or account deletion']} />
                  <TableRow cells={['Rate-limit records', 'Auto-expire after 60-second sliding window']} />
                </tbody>
              </table>
            </div>
            <p className="mt-3">Upon termination of the agreement, KBPipe will delete all Controller personal data within <strong>30 days</strong>, unless prohibited by law.</p>
          </Section>

          {/* 12. Liability & Governing Law */}
          <Section icon={Scale} title="12. Liability & Governing Law" id="liability">
            <p>Each party is liable for damages caused by its own non-compliance with Applicable Privacy Law. KBPipe&apos;s liability is subject to the limitations in the <Link href="/terms" className="text-gray-900 font-medium hover:underline">Terms of Service</Link>, except where prohibited by applicable law.</p>
            <p><strong>Governing law:</strong> For EU/EEA Controllers, this DPA is governed by the laws of the Controller&apos;s EU member state. For US Controllers, this DPA is governed by the laws of the State of Israel. The SCCs (if applicable) are governed by the laws of the relevant EU member state.</p>
            <p>This DPA is co-terminus with the KBPipe Terms of Service. Obligations survive termination to the extent personal data remains in KBPipe&apos;s possession.</p>
          </Section>

          <div className="border-t border-gray-100" />

          {/* Contact */}
          <div className="rounded-xl bg-gray-50 p-5 text-center space-y-2">
            <p className="text-sm text-gray-600">
              Questions about this DPA or need a signed copy? Contact us at
            </p>
            <a href="mailto:privacy@kbpipe.io" className="text-sm text-gray-900 font-medium hover:underline">
              privacy@kbpipe.io
            </a>
          </div>

          <div className="text-center text-xs text-gray-400 space-y-1">
            <p>
              See also: <Link href="/privacy" className="hover:text-gray-600 underline">Privacy Policy</Link> &middot; <Link href="/terms" className="hover:text-gray-600 underline">Terms of Service</Link> &middot; <Link href="/security" className="hover:text-gray-600 underline">Security Overview</Link>
            </p>
          </div>

          <div className="border-t border-gray-100 pt-4 text-center">
            <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
              &larr; Back to KBPipe
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
