import { Link } from 'react-router-dom';

const Section = ({ n, title, children }) => (
    <section className="mb-8">
        <h2 className="text-lg font-bold text-navy-950 mb-3">
            <span className="text-gray-400 mr-2">{n}.</span>{title}
        </h2>
        <div className="text-sm text-gray-700 leading-relaxed space-y-3">{children}</div>
    </section>
);

const TutorAgreement = () => (
    <div className="min-h-screen bg-white">
        <div className="max-w-[900px] mx-auto px-6 lg:px-10 py-16">
            <div className="mb-10">
                <p className="text-xs font-bold tracking-[0.2em] text-gray-400 uppercase mb-3">Legal</p>
                <h1 className="text-4xl font-extrabold text-navy-950 tracking-tight">Tutor Service Agreement</h1>
                <p className="mt-3 text-sm text-gray-500">
                    For Tutors who apply to teach on Tutnet. Effective: April 2026. Jurisdiction: Hyderabad, Telangana, India.
                </p>
            </div>

            <Section n="1" title="Parties and Scope">
                <p>
                    This Agreement is entered into between Tutnet ("Platform") and the individual applying for or holding a Tutor account ("Tutor"). It governs the terms on which the Tutor is introduced to Users (parents, guardians, and students) and provides tutoring services through the Platform.
                </p>
                <p>
                    The Tutor is an independent service provider, not an employee of the Platform. The Platform provides discovery, scheduling, payments, and dispute resolution; the Tutor is responsible for delivering high-quality tutoring.
                </p>
            </Section>

            <Section n="2" title="Eligibility and Verification">
                <p>
                    <strong>2.1</strong> The Tutor consents to Platform verification of identity (Aadhaar or equivalent), academic credentials, prior experience, and background as the Platform deems reasonable. Tutor profile status (draft, pending, approved) is determined by the Platform in its discretion.
                </p>
                <p>
                    <strong>2.2</strong> The Tutor will keep profile information accurate and current, including availability, subjects, rates, and contact details.
                </p>
            </Section>

            <Section n="3" title="Non-Circumvention and On-Platform Delivery">
                <p>
                    <strong>3.1</strong> The Tutor agrees to deliver <strong>all</strong> tutoring services to any User introduced through the Platform exclusively on and through the Platform. This applies to trials, single sessions, and long-term engagements.
                </p>
                <p>
                    <strong>3.2</strong> The Tutor shall not, directly or indirectly, for a period of <strong>twenty-four (24) months</strong> from the date of last session with a User introduced through the Platform:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                    <li>solicit, contact, or accept engagement with such User outside the Platform;</li>
                    <li>share phone numbers, UPI IDs, wallet handles, social-media handles, or payment links with Users;</li>
                    <li>conduct payments in cash, by UPI, or by any other off-Platform means for sessions arranged via the Platform;</li>
                    <li>refer any such User to any competing platform or informal arrangement;</li>
                    <li>encourage or permit a User to circumvent the Platform.</li>
                </ul>
                <p>
                    <strong>3.3</strong> The Tutor acknowledges that the Platform's investment in lead acquisition, verification, dispute resolution, and payment processing is a protected business interest, and that §3.2 is reasonable in scope and duration.
                </p>
                <p>
                    <strong>3.4</strong> <em>Rate parity:</em> The Tutor's rate for any similar service offered outside the Platform to any individual or household shall not be less than the Tutor's current Platform rate. Reports or detection of underpriced off-Platform offers are grounds for action under §9.
                </p>
            </Section>

            <Section n="4" title="Fees, Tiers, and Incentives">
                <p>
                    <strong>4.1 Commission structure.</strong> The Platform retains a commission on each completed session. The base commission for newly-approved Tutors is 25%. The Platform may reduce this commission based on tenure, session volume, rating, and compliance, as published from time to time on the Tutor dashboard. Published commission tiers are a privilege, not a right, and may be revised by the Platform on reasonable notice.
                </p>
                <p>
                    <strong>4.2 Payouts.</strong> Tutor earnings for each calendar month are payable in weekly instalments. The Platform may retain up to 20% of the final weekly instalment for up to 60 days following month-end as a reserve against payment disputes, refunds, and unresolved quality matters. Any portion not required for such purposes is released after the reserve period.
                </p>
                <p>
                    <strong>4.3 Performance incentives.</strong> The Platform may offer milestone-based incentives including but not limited to session-count bonuses, consecutive-month retention bonuses, multi-student activity bonuses, and rating-based rewards. All incentives are earned only on verified on-Platform delivery, are not payable in cash off-Platform, and are forfeited upon any breach of §3, §6, or §9.
                </p>
                <p>
                    <strong>4.4 Renewal bonuses.</strong> Where a User's monthly subscription is renewed through the Platform for a continuing engagement with a given Tutor, the Tutor may be eligible for a renewal bonus. Such bonuses are payable only on on-Platform renewal and are not earned where the Platform has reasonable cause to believe the engagement has shifted partially or fully off-Platform.
                </p>
            </Section>

            <Section n="5" title="Security Deposit">
                <p>
                    <strong>5.1</strong> As a condition of activation, the Tutor shall place a refundable security deposit of <strong>₹1,000</strong> with the Platform, payable at or prior to first session.
                </p>
                <p>
                    <strong>5.2</strong> The deposit is returnable in full upon clean exit, defined as (a) no unresolved User complaints, (b) no verified breach of §3, (c) no outstanding liabilities to the Platform, and (d) a minimum service period of six (6) months or an agreed early exit. The Platform may release the deposit sooner at its discretion.
                </p>
                <p>
                    <strong>5.3</strong> The deposit is forfeited in whole or part upon any of the following: verified breach of §3 (non-circumvention); repeated under-reporting of sessions (§6); termination for cause under §9; or outstanding refund obligations to Users that the Tutor has failed to remedy.
                </p>
            </Section>

            <Section n="6" title="Session Reporting and Accuracy">
                <p>
                    <strong>6.1</strong> The Tutor shall log every session delivered to any Platform-introduced User on the Platform, promptly and accurately, including start time, duration, topics covered, and homework assigned. The number of sessions logged must match the number of sessions actually delivered to that User.
                </p>
                <p>
                    <strong>6.2</strong> The Platform may periodically cross-check session counts via parent confirmation surveys, progress review, homework-coverage audit, and other means. Repeated or material discrepancies between logged and delivered sessions are a material breach of this Agreement.
                </p>
                <p>
                    <strong>6.3</strong> Consequences of confirmed under-reporting include deposit forfeiture, clawback of prior incentives paid, reset of Tutor tier, temporary suspension, and termination.
                </p>
            </Section>

            <Section n="7" title="Quality Reviews and Platform Audits">
                <p>
                    <strong>7.1</strong> To maintain service quality, the Platform may conduct quality reviews, including placing sample booking requests or trial inquiries through the Platform for assessment purposes. The Tutor consents to such reviews and agrees to treat every booking request with the same professional standard regardless of whether it is a real or assessment booking.
                </p>
                <p>
                    <strong>7.2</strong> The Tutor's response to any such request shall in all cases comply with this Agreement, particularly §3 (non-circumvention) and §6 (session reporting).
                </p>
            </Section>

            <Section n="8" title="Communication and Conduct">
                <p>
                    <strong>8.1</strong> All communication with Platform-introduced Users shall take place via the Platform's messaging, proxy-phone, or in-platform video tools. Sharing of direct phone numbers, UPI handles, social-media contacts, or payment links with Users is prohibited.
                </p>
                <p>
                    <strong>8.2</strong> The Tutor agrees to conduct themselves professionally, respect the safety of minors, and comply with applicable law during home visits, including all Platform guidelines regarding child safety.
                </p>
            </Section>

            <Section n="9" title="Termination and Consequences">
                <p>
                    <strong>9.1</strong> The Platform may suspend or terminate this Agreement and the Tutor's account immediately for material breach, including:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                    <li>any verified violation of §3 (non-circumvention and rate parity);</li>
                    <li>repeated or material under-reporting of sessions (§6);</li>
                    <li>confirmed safety, harassment, or conduct complaints;</li>
                    <li>impersonation, account sharing, or fabricating reviews;</li>
                    <li>inducing a User to submit false refund claims.</li>
                </ul>
                <p>
                    <strong>9.2</strong> Termination for cause may result in (a) deposit forfeiture, (b) clawback of incentives and bonuses paid in the preceding six (6) months, (c) tier reset and loss of any accrued preferential commission, (d) withholding of any final payout against unresolved User claims, and (e) where applicable, notification to the Tutor's referring institution or placement coordinator.
                </p>
                <p>
                    <strong>9.3</strong> Where the Platform has reasonable belief of a breach of §3, it may suspend payouts and account access pending investigation for up to 30 days.
                </p>
            </Section>

            <Section n="10" title="Confidentiality and Data">
                <p>
                    User contact information, addresses, and child-related data accessed via the Platform are confidential and may only be used for delivering the engaged service. Copying, storing, or using such data for any other purpose, including solicitation of off-Platform business, is prohibited and is a material breach of this Agreement.
                </p>
            </Section>

            <Section n="11" title="Independent Contractor Status">
                <p>
                    Nothing in this Agreement creates an employer-employee, partnership, or agency relationship. The Tutor is responsible for their own taxes, statutory filings, and any permits required to provide tutoring services.
                </p>
            </Section>

            <Section n="12" title="Dispute Resolution and Jurisdiction">
                <p>
                    This Agreement is governed by the laws of India. Any dispute arising under this Agreement shall be subject to the exclusive jurisdiction of the courts at Hyderabad, Telangana. The Platform may seek injunctive relief to enforce §3 (non-circumvention) without limitation of its other remedies.
                </p>
            </Section>

            <Section n="13" title="Amendments">
                <p>
                    The Platform may update this Agreement with reasonable notice. Continued use of the Platform after such updates constitutes acceptance. Material changes to commission, deposit, or non-circumvention terms will be notified at least 14 days before taking effect.
                </p>
            </Section>

            <div className="mt-12 pt-8 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                <Link to="/terms" className="hover:text-navy-950 transition-colors">
                    View Parent Terms of Service →
                </Link>
                <span>Last updated: April 2026</span>
            </div>
        </div>
    </div>
);

export default TutorAgreement;
