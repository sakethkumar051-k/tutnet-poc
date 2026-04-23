import { Link } from 'react-router-dom';

const Section = ({ n, title, children }) => (
    <section className="mb-8">
        <h2 className="text-lg font-bold text-navy-950 mb-3">
            <span className="text-gray-400 mr-2">{n}.</span>{title}
        </h2>
        <div className="text-sm text-gray-700 leading-relaxed space-y-3">{children}</div>
    </section>
);

const Terms = () => (
    <div className="min-h-screen bg-white">
        <div className="max-w-[900px] mx-auto px-6 lg:px-10 py-16">
            <div className="mb-10">
                <p className="text-xs font-bold tracking-[0.2em] text-gray-400 uppercase mb-3">Legal</p>
                <h1 className="text-4xl font-extrabold text-navy-950 tracking-tight">Terms of Service</h1>
                <p className="mt-3 text-sm text-gray-500">
                    For parents and students. Effective: April 2026. Jurisdiction: Hyderabad, Telangana, India.
                </p>
            </div>

            <Section n="1" title="Acceptance of Terms">
                <p>
                    By registering, booking a session, or otherwise using the Tutnet platform ("Platform"), you ("User," "Parent," or "Guardian") accept these Terms of Service. If you are booking on behalf of a minor, you confirm you are the parent or legal guardian and consent to these terms on the minor's behalf.
                </p>
            </Section>

            <Section n="2" title="Scope of Service">
                <p>
                    Tutnet operates a marketplace connecting Users with independent tutors ("Tutors") for 1:1 tutoring services at home or online. Sessions are offered as monthly subscriptions with an inclusive session allowance (e.g., "up to 20 sessions per month"). Additional sessions beyond the allowance, where supported, are covered at no extra charge at the Platform's discretion.
                </p>
                <p>
                    Tutnet facilitates discovery, scheduling, payment, attendance tracking, and dispute resolution. Tutors are not employees of Tutnet; however, all service delivery between Users and Tutors engaged through the Platform is governed by these Terms and must occur on-Platform.
                </p>
            </Section>

            <Section n="3" title="Tutor Engagement and Non-Circumvention">
                <p>
                    <strong>3.1</strong> Any Tutor introduced to you through the Platform, including via trial/demo classes, is engaged under the Platform's terms. All sessions, payments, scheduling, and communication for the duration of the tutoring relationship, and for a period of <strong>twelve (12) months</strong> following your last session with that Tutor, must take place on the Platform.
                </p>
                <p>
                    <strong>3.2</strong> You agree not to directly or indirectly solicit, engage, pay, or receive services from any Tutor introduced through the Platform outside of the Platform, nor to facilitate, encourage, or knowingly permit any Tutor to do so.
                </p>
                <p>
                    <strong>3.3</strong> Off-Platform arrangements remove the Platform's ability to verify attendance, verify Tutor identity and background checks, provide refunds for missed or unsatisfactory sessions, resolve disputes, or protect minors in the home environment. You acknowledge these risks are assumed solely by you in any off-Platform arrangement.
                </p>
            </Section>

            <Section n="4" title="Payments and Payment Methods">
                <p>
                    <strong>4.1</strong> Monthly subscription fees are charged upfront. The Platform's preferred payment methods are UPI AutoPay mandates and net-banking. Card payments may be offered for eligible Users after a minimum platform history and are subject to additional verification.
                </p>
                <p>
                    <strong>4.2</strong> You represent that you are the authorised holder of any payment instrument used, and that the billing information provided is accurate. Payment chargebacks or disputes raised in bad faith, including disputes for sessions verifiably delivered per Platform records, may result in account suspension, debt-recovery proceedings, and forfeiture of any credits or cashbacks.
                </p>
                <p>
                    <strong>4.3</strong> Refunds for missed, cancelled, or unsatisfactory sessions are processed per the Refund Policy. Refund eligibility requires that the session in question has been logged and verified on the Platform. Sessions conducted or arranged off-Platform are ineligible for any refund.
                </p>
                <p>
                    <strong>4.4</strong> The Platform may, at its discretion, delay release of final monthly amounts to service providers for up to 60 days post month-end to protect against payment disputes.
                </p>
            </Section>

            <Section n="5" title="Attendance, Session Records, and Verification">
                <p>
                    <strong>5.1</strong> Each session must be logged on the Platform by the Tutor, with parent or student confirmation when requested. You agree to respond promptly to session-confirmation prompts sent via the Platform, SMS, or email.
                </p>
                <p>
                    <strong>5.2</strong> The Platform may contact you periodically to verify session counts, session quality, attendance, and the nature of communications with your Tutor. Accurate responses are a condition of continued service.
                </p>
                <p>
                    <strong>5.3</strong> Discrepancies between Platform-logged sessions and sessions actually delivered, whether reported by you or detected by the Platform, may trigger audit, refund adjustment, and action against the Tutor.
                </p>
            </Section>

            <Section n="6" title="Pricing and Parity">
                <p>
                    Fees for tutoring engaged through the Platform are set by the Platform in coordination with the Tutor. Any rate quoted or charged by a Tutor outside the Platform for the same or substantially similar service shall not be lower than the Platform rate. Reports of underpriced off-Platform offers will be investigated.
                </p>
            </Section>

            <Section n="7" title="Communication and Safety">
                <p>
                    <strong>7.1</strong> All communication with your Tutor should occur via the Platform's in-app messaging. The Platform may mask phone numbers, filter or redact contact information and payment handles shared in messages, and retain message records for safety, dispute, and quality purposes.
                </p>
                <p>
                    <strong>7.2</strong> For in-person sessions, full residential address is shared with the Tutor only after booking confirmation and not earlier than 60 minutes before the scheduled session. For trial/demo sessions, in-Platform video rooms may be offered as the default.
                </p>
                <p>
                    <strong>7.3</strong> Any safety concern involving a minor must be reported immediately to the Platform via the in-app Report feature or the support email listed on the Platform.
                </p>
            </Section>

            <Section n="8" title="Reporting Off-Platform Requests; User Incentives">
                <p>
                    <strong>8.1</strong> If a Tutor requests, suggests, or hints at moving any part of your engagement off the Platform, including requests for direct phone numbers, payment handles, cash arrangements, or out-of-Platform scheduling, you may report this via the in-app "Report Off-Platform Request" feature.
                </p>
                <p>
                    <strong>8.2</strong> Verified reports may receive Platform credits or cashback as determined under the Platform's prevailing incentive schedule. Incentives are non-transferable, limited to a maximum of one verified report per tutor–parent pair per quarter, and subject to Platform verification before credit.
                </p>
                <p>
                    <strong>8.3</strong> Submitting false or bad-faith reports may result in forfeiture of Platform credits and account suspension.
                </p>
            </Section>

            <Section n="9" title="Trial / Demo Sessions">
                <p>
                    Trial sessions are provided free of charge as an introduction to a Tutor. Contact information is not exchanged for a trial. The trial is conducted either through the Platform's in-app video room or, where an in-person trial is offered, only on masked coordination (proxy phone number, time-bound address release). Up to three (3) trial sessions may be requested per User account. Trial Tutors are subject to the same non-circumvention restrictions in §3 once introduced through the Platform.
                </p>
            </Section>

            <Section n="10" title="Account Conduct">
                <p>
                    You agree to provide accurate information, not impersonate others, not create multiple accounts to evade restrictions, and not interfere with Platform operations. Violations may result in suspension, termination, and forfeiture of any credits, cashbacks, or pending refunds.
                </p>
            </Section>

            <Section n="11" title="Minors and Data">
                <p>
                    Tutnet collects minimal personally identifying information about minors necessary for service delivery. Guardians control and consent to all data collection on behalf of minors. Parents may request data correction or deletion through the in-app settings or by writing to the Platform.
                </p>
            </Section>

            <Section n="12" title="Disputes, Jurisdiction, and Indemnity">
                <p>
                    These Terms are governed by the laws of India. Exclusive jurisdiction for any dispute lies in the courts at Hyderabad, Telangana. You agree to indemnify and hold Tutnet harmless from claims arising from your breach of these Terms, including losses arising from off-Platform arrangements made in violation of §3.
                </p>
            </Section>

            <Section n="13" title="Changes to these Terms">
                <p>
                    Tutnet may update these Terms from time to time. Continued use of the Platform after changes are posted constitutes acceptance of the revised Terms. Material changes to fees, non-circumvention, or payment terms will be notified via in-app notification and email at least 7 days before taking effect.
                </p>
            </Section>

            <div className="mt-12 pt-8 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                <Link to="/tutor-agreement" className="hover:text-navy-950 transition-colors">
                    View Tutor Service Agreement →
                </Link>
                <span>Last updated: April 2026</span>
            </div>
        </div>
    </div>
);

export default Terms;
