import { BookOpenCheck, ListChecks, Globe2, Infinity as InfinityIcon, BadgeCheck, LineChart } from "lucide-react";

export default function WhyChooseSection() {
    const features = [
        {
            icon: BookOpenCheck,
            title: "Exam-Focused Curriculum",
            desc: "Structured lessons built around current exam outlines, so every hour you study moves you closer to passing.",
            points: ["Clear learning path", "Expert-built content"],
        },
        {
            icon: ListChecks,
            title: "Quizzes to Test Your Knowledge",
            desc: "Check what you've learned after every topic, then take full-length, timed practice exams that feel like the real thing.",
            points: ["Timed mock exams", "Instant scores", "Answer explanations"],
        },
        {
            icon: Globe2,
            title: "Prepare for Global Certification",
            desc: "Get ready for globally recognized certifications like PMP®, AWS, Microsoft Azure and CompTIA with one focused plan.",
            points: ["PMP®", "Cloud", "Security", "DevOps"],
        },
        {
            icon: InfinityIcon,
            title: "Lifetime Access",
            desc: "Learn at your own pace and come back to any lesson whenever you need a refresher, even after you pass.",
            points: ["Self-paced", "Any device"],
        },
        {
            icon: LineChart,
            title: "Track Your Progress",
            desc: "Pick up exactly where you left off and see your lessons completed and exams passed at a glance.",
            points: ["Auto-resume", "Exam progress"],
        },
        {
            icon: BadgeCheck,
            title: "Verified Certificate",
            desc: "Complete your lessons and pass the course exams to earn a certificate anyone can verify online. PMP® learners get the 35 contact hours needed to apply.",
            points: ["Online verification", "35 contact hours for PMP®"],
        },
    ];

    return (
        <section className="relative py-24 bg-[#020617] text-white overflow-hidden">
            <div className="max-w-[1400px] mx-auto px-6">
                {/* Badge */}
                <div className="flex justify-center mb-6">
                    <span className="text-xs tracking-widest border border-blue-400/30 text-blue-300 px-5 py-2 rounded-full bg-blue-500/10">
                        THE CERTEZY ADVANTAGE
                    </span>
                </div>

                {/* Heading */}
                <h2 className="text-center font-bold text-4xl md:text-5xl lg:text-6xl mb-6">
                    Why Choose <span className="text-blue-400">Certezy?</span>
                </h2>

                <p className="text-center text-gray-400 max-w-2xl mx-auto mb-16">
                    Everything you need to learn the material, test your knowledge and walk into exam day
                    confident.
                </p>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {features.map((feature) => (
                        <FeatureCard key={feature.title} feature={feature} />
                    ))}
                </div>
            </div>
        </section>
    );
}

function FeatureCard({ feature }) {
    const Icon = feature.icon;

    return (
        <div className="flex flex-col bg-[#0f172a] border border-white/10 rounded-2xl p-8 transition duration-300 hover:scale-[1.03] hover:border-blue-500/40 hover:shadow-xl">
            <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-blue-500/10 mb-6">
                <Icon size={22} className="text-blue-400" />
            </div>

            <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>

            <p className="text-gray-400 text-sm leading-relaxed">{feature.desc}</p>

            <ul className="mt-auto flex flex-wrap gap-2 pt-6">
                {feature.points.map((point) => (
                    <li
                        key={point}
                        className="rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-xs text-blue-200"
                    >
                        {point}
                    </li>
                ))}
            </ul>
        </div>
    );
}
