/**
 * Company profile — configured once, reused across every generated document.
 *
 * Portfolio entries mirror the public site at https://appibrium.com/works.
 * Update this file when new work ships; proposals pick these up automatically
 * so nothing has to be re-typed per proposal.
 */

export interface WorkItem {
  id: string;
  title: string;
  category: string;
  summary: string;
  tech: string;
  /** Square-ish logo/thumbnail shown in the proposal portfolio card. */
  image: string;
  /** Optional measurable outcome. Left blank unless a real figure exists. */
  result?: string;
}

export const COMPANY_WORKS: WorkItem[] = [
  {
    id: "junior-cambrian",
    image: "https://ratulhasanruhan.github.io/assets/projects/junior.png",
    title: "Junior Cambrian",
    category: "EdTech",
    summary:
      "An innovative Learning Management System with gamification designed to enhance student engagement — interactive lessons, progress tracking, achievement badges, and collaborative learning tools.",
    tech: "React, Node.js, MongoDB, Socket.io",
  },
  {
    id: "sydrix-ai",
    image: "https://ratulhasanruhan.github.io/assets/projects/sydrix_ai.png",
    title: "Sydrix AI",
    category: "EdTech",
    summary:
      "Smart study management AI platform that personalises learning through intelligent content recommendations, study schedule optimisation, and performance analytics.",
    tech: "Python, TensorFlow, React, FastAPI",
  },
  {
    id: "hello-chatkhil",
    image: "https://ratulhasanruhan.github.io/assets/projects/hello_chatkhil.png",
    title: "Hello Chatkhil",
    category: "Healthcare",
    summary:
      "A comprehensive medical and blood donation application serving the Chatkhil community, featuring an emergency blood request system, health consultations, medical records, and a volunteer network.",
    tech: "Flutter, Firebase, Node.js, Express",
  },
  {
    id: "istt-university",
    image: "https://ratulhasanruhan.github.io/assets/projects/istt.jpeg",
    title: "ISTT University",
    category: "EdTech",
    summary:
      "Routine management system for the Institute of Science, Trade & Technology, streamlining academic scheduling, class management, faculty coordination, and student notifications.",
    tech: "React, PHP, MySQL, Bootstrap",
  },
  {
    id: "sikhboi",
    image: "https://ratulhasanruhan.github.io/assets/projects/sikhboi.webp",
    title: "Sikhboi",
    category: "EdTech",
    summary:
      "A platform for digital learners featuring interactive courses, skill assessments, certification programs, and personalised learning paths to widen access to quality education.",
    tech: "Vue.js, Laravel, MySQL, Redis",
  },
  {
    id: "bandhu-ai",
    image: "https://ratulhasanruhan.github.io/assets/projects/bandhu.png",
    title: "Bandhu AI",
    category: "AI/ML Solution",
    summary:
      "A social networking platform connecting communities, with community groups, event management, a local business directory, and social commerce.",
    tech: "React Native, Express, PostgreSQL, Redis",
  },
  {
    id: "richminis",
    image: "https://ratulhasanruhan.github.io/assets/projects/richminis.webp",
    title: "Richminis",
    category: "E-commerce",
    summary:
      "A modern, high-performance e-commerce platform built for speed, scalability, and a seamless shopping experience.",
    tech: "Next.js, React, Tailwind CSS, Stripe",
  },
  {
    id: "ilmpurity",
    image: "https://ratulhasanruhan.github.io/assets/projects/ilmpurity.webp",
    title: "Ilmpurity",
    category: "EdTech",
    summary:
      "A Learning Management System with an AI-based exam engine using Retrieval-Augmented Generation and computer vision for automated answer checking.",
    tech: "React, Node.js, RAG, Computer Vision",
  },
  {
    id: "care-life-touch",
    image: "https://ratulhasanruhan.github.io/assets/projects/care_life_touch.webp",
    title: "Care Life Touch",
    category: "Healthcare",
    summary:
      "A healthcare and medicine service platform with real-time prescription parsing, pharmacy inventory syncing, and automated courier routing for express deliveries.",
    tech: "Flutter, Django, PostgreSQL, Redis",
  },
];

export const WORK_CATEGORIES = Array.from(new Set(COMPANY_WORKS.map((w) => w.category)));

export function worksByIds(ids: string[]): WorkItem[] {
  return COMPANY_WORKS.filter((w) => ids.includes(w.id));
}
