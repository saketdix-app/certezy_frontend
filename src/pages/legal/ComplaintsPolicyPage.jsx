import { Link } from "react-router-dom";
import { COMPANY, ROUTES } from "@/config/app";
import LegalLayout, { Section } from "./LegalLayout";
import { LEGAL } from "./legal.config";

// From "Certezy_Customer_Complaints_and_Resolution_Policy.docx" (v1.0)
const EFFECTIVE_DATE = "November 5, 2026";

const SECTIONS = [
    "Purpose and commitment",
    "Scope",
    "How to submit a complaint",
    "Acknowledgement and response times",
    "Complaint review and resolution process",
    "Escalation path",
    "Confidentiality, records and fair treatment",
    "Continuous improvement",
    "Policy publication and review",
    "Contact details",
];

const RESPONSE_TIMES = [
    [
        "Receipt acknowledgement",
        "Within 1 working day",
        "Written confirmation that the complaint has been received, a reference number where available, and the next steps.",
    ],
    [
        "Initial review / clarification",
        "Within 3 working days",
        "A review of the issue; we may contact the customer for missing details or supporting evidence.",
    ],
    [
        "Resolution target",
        "Within 10 working days",
        "A written outcome, proposed remedy or explanation of the action taken.",
    ],
    [
        "Complex cases",
        "Normally within 20 working days",
        "If more time is needed, we will explain why, provide a revised target date and send progress updates at least every 5 working days.",
    ],
    [
        "Escalation review",
        "Within 5 working days of escalation",
        "A manager or designated senior representative will review the handling and communicate the review outcome or next steps.",
    ],
];

const PROCESS = [
    [
        "Record",
        "The complaint is logged with the date received, customer details, issue category, supporting information and a tracking reference where available.",
    ],
    [
        "Assign",
        "The complaint is assigned to an appropriate support representative or department. A complaint involving the person handling it will be reassigned where reasonably practicable.",
    ],
    [
        "Assess",
        "We review the facts, relevant account/course records, communications and applicable terms. We may contact the customer or relevant staff for clarification.",
    ],
    [
        "Decide and act",
        "We determine an appropriate response and, where justified, take corrective action. Depending on the case, this may include correcting an account or course-access issue, providing missing information or materials, arranging a service review, correcting an administrative record, or considering a refund/credit in accordance with the applicable terms and law.",
    ],
    [
        "Communicate and close",
        "We provide the outcome in writing, explain the reasons, identify any action taken or proposed and advise how to request escalation if the customer remains dissatisfied.",
    ],
];

function Email() {
    return (
        <a href={`mailto:${LEGAL.email}`} className="font-semibold">
            {LEGAL.email}
        </a>
    );
}

export default function ComplaintsPolicyPage() {
    const address = COMPANY.addressLines.join(", ");

    return (
        <LegalLayout
            title="Customer Complaints & Resolution Policy"
            effectiveDate={EFFECTIVE_DATE}
            meta="Version 1.0"
            sections={SECTIONS}
            intro="How students, customers and other service users can raise a complaint with Certezy, how we review it, how to escalate it, and the response times you can expect."
        >
            <Section title="Purpose and commitment">
                <p>
                    {COMPANY.legalName} (&ldquo;Certezy&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo; or
                    &ldquo;us&rdquo;) is committed to providing reliable, fair and professional education,
                    training and related services. We welcome feedback and take complaints seriously. This
                    policy explains how students, customers, clients and other service users can raise a
                    complaint, how we review it, the communication and escalation path, and the response times
                    they can expect.
                </p>
                <p>
                    We will handle complaints respectfully, objectively and without discrimination or
                    retaliation. Raising a complaint in good faith will not affect a customer&rsquo;s access to
                    support or services, except where a lawful or necessary operational action applies.
                </p>
            </Section>

            <Section title="Scope">
                <p>
                    This policy applies to complaints about services provided by Certezy, including course
                    enrolment and registration, payments and invoices, access to the learning platform, course
                    videos and learning materials, assessments and practice tests, instructors and support
                    staff, course administration, certificates issued by Certezy, and customer service or
                    communication.
                </p>
                <p>
                    This policy does not give Certezy authority over decisions made independently by external
                    certification bodies, examination providers, universities, payment providers or other
                    third parties. Where a complaint concerns such an organisation&rsquo;s examination,
                    credential, eligibility, result or decision, we will explain the relevant boundary and,
                    where appropriate, direct the customer to that organisation&rsquo;s official support or
                    appeal channel.
                </p>
            </Section>

            <Section title="How to submit a complaint">
                <p>A customer may submit a complaint through any of the following official channels:</p>
                <ul>
                    <li>
                        <strong>Email:</strong> <Email />
                    </li>
                    <li>
                        <strong>Website:</strong> our{" "}
                        <Link to={ROUTES.CONTACT}>contact form at {LEGAL.website}/contact-us</Link>
                    </li>
                    <li>
                        <strong>Telephone / WhatsApp:</strong>{" "}
                        {LEGAL.phones.map((p, i) => (
                            <span key={p.region}>
                                {i > 0 && " or "}
                                <a href={p.href}>{p.number}</a> ({p.label})
                            </span>
                        ))}
                    </li>
                    <li>
                        <strong>Postal address:</strong> {COMPANY.legalName}, {address}
                    </li>
                </ul>
                <p>
                    Please include your full name, registered email address or phone number, course or order
                    reference (if applicable), a clear description of the concern, relevant dates, supporting
                    documents or screenshots, and the outcome you are seeking. Customers who need assistance
                    submitting a complaint may ask our support team for help. There is no fee for lodging a
                    complaint.
                </p>
            </Section>

            <Section title="Acknowledgement and response times">
                <p>
                    The timelines below are Certezy&rsquo;s customer-service targets and are measured in working
                    days (Monday to Friday, excluding public holidays in the location of the handling team). We
                    will make reasonable efforts to respond sooner.
                </p>
                <div className="overflow-x-auto mb-3">
                    <table className="min-w-[560px]">
                        <thead>
                            <tr>
                                <th>Stage</th>
                                <th>Target timeframe</th>
                                <th>What the customer can expect</th>
                            </tr>
                        </thead>
                        <tbody>
                            {RESPONSE_TIMES.map(([stage, time, expect]) => (
                                <tr key={stage}>
                                    <td className="font-semibold !text-slate-900">{stage}</td>
                                    <td className="whitespace-nowrap">{time}</td>
                                    <td>{expect}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p>
                    If a complaint is received outside normal business hours, the acknowledgement period begins
                    on the next working day. Time spent waiting for information from the customer or a third
                    party may affect the resolution date; we will keep the customer informed.
                </p>
            </Section>

            <Section title="Complaint review and resolution process">
                <p>Certezy follows a documented, step-by-step process:</p>
                <ol>
                    {PROCESS.map(([step, text]) => (
                        <li key={step}>
                            <strong>{step}:</strong> {text}
                        </li>
                    ))}
                </ol>
                <p>
                    We will not promise a particular outcome before reviewing the facts. Any refund,
                    cancellation, replacement, credit or other remedy will be assessed under the applicable
                    contract, published refund/cancellation terms and applicable law.
                </p>
            </Section>

            <Section title="Escalation path">
                <p>
                    If the customer is dissatisfied with the initial response, or believes the complaint has
                    not been handled appropriately, they may request escalation by replying to the complaint
                    email or writing to <Email /> with &ldquo;Escalation&rdquo; in the subject line. The request
                    should include the original complaint reference, explain what remains unresolved and state
                    the outcome being requested.
                </p>
                <p>
                    The complaint will be reviewed by a manager or designated senior representative who was not
                    directly responsible for the original decision, where reasonably practicable. We aim to
                    acknowledge the escalation within 1 working day and provide the review outcome or a progress
                    update within 5 working days. If further investigation is required, we will provide a
                    revised timeframe and keep the customer informed.
                </p>
                <p>
                    If the customer remains dissatisfied after completing Certezy&rsquo;s internal process, they
                    may consider any remedies available under applicable consumer protection laws or approach
                    the appropriate external consumer grievance or legal forum. Nothing in this policy limits
                    any statutory rights or remedies.
                </p>
            </Section>

            <Section title="Confidentiality, records and fair treatment">
                <p>
                    Complaint information will be accessed only by personnel who need it to review, investigate
                    or resolve the matter, and will be handled in accordance with applicable privacy and
                    data-protection requirements (see our <Link to={ROUTES.PRIVACY}>Privacy Policy</Link>). We
                    will retain complaint records and related actions for an appropriate period to support
                    resolution, audit and service improvement, subject to applicable law and our retention
                    practices.
                </p>
                <p>
                    We will treat customers and staff fairly, protect personal information, and take reasonable
                    steps to prevent conflicts of interest in complaint handling. We may decline to engage with
                    abusive, threatening or unlawful communications, but will still consider the substantive
                    complaint where reasonably possible.
                </p>
            </Section>

            <Section title="Continuous improvement">
                <p>
                    Certezy reviews complaint themes and outcomes periodically to identify recurring issues and
                    improve our courses, platform, communication, support processes and service quality. Where
                    appropriate, we may make operational or training changes to reduce the likelihood of similar
                    complaints.
                </p>
            </Section>

            <Section title="Policy publication and review">
                <p>
                    This policy is intended for public access and is available on Certezy&rsquo;s website and
                    provided to customers on request. It will be reviewed at least annually and earlier if there
                    are material changes to our services, applicable requirements or complaint-handling
                    arrangements.
                </p>
            </Section>

            <Section title="Contact details">
                <ul>
                    <li>
                        <strong>Company:</strong> {COMPANY.legalName}
                    </li>
                    <li>
                        <strong>Customer support and complaints email:</strong> <Email />
                    </li>
                    <li>
                        <strong>Escalation:</strong> <Email /> (subject: &ldquo;Escalation&rdquo;)
                    </li>
                    {LEGAL.phones.map((p) => (
                        <li key={p.region}>
                            <strong>Telephone / WhatsApp ({p.label}):</strong> <a href={p.href}>{p.number}</a>
                        </li>
                    ))}
                    <li>
                        <strong>Website / complaint form:</strong>{" "}
                        <Link to={ROUTES.CONTACT}>{LEGAL.website}/contact-us</Link>
                    </li>
                    <li>
                        <strong>Registered office:</strong> {address}
                    </li>
                </ul>
            </Section>
        </LegalLayout>
    );
}
