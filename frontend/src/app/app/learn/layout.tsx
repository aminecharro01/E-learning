import { CourseProvider } from "@/components/learner/CourseProvider";

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return <CourseProvider>{children}</CourseProvider>;
}
