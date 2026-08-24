import type { LucideProps } from "lucide-react";
import {
  LayoutGrid,
  BookOpen,
  HelpCircle,
  Users,
  BarChart3,
  Image as ImageIcon,
  Settings,
  UserCircle,
  Award,
  Mail,
  Clock,
  MessageSquare,
  MessageCircle,
  ClipboardList,
  Shield,
  Calendar,
  Briefcase,
} from "lucide-react";

type IconProps = LucideProps;

export function GridIcon(props: IconProps) {
  return <LayoutGrid {...props} />;
}

export function BookIcon(props: IconProps) {
  return <BookOpen {...props} />;
}

export function JobsIcon(props: IconProps) {
  return <Briefcase {...props} />;
}

export function QuizIcon(props: IconProps) {
  return <HelpCircle {...props} />;
}

export function UsersIcon(props: IconProps) {
  return <Users {...props} />;
}

export function ChartIcon(props: IconProps) {
  return <BarChart3 {...props} />;
}

export function MediaIcon(props: IconProps) {
  return <ImageIcon {...props} />;
}

export function SettingsIcon(props: IconProps) {
  return <Settings {...props} />;
}

export function UserCircleIcon(props: IconProps) {
  return <UserCircle {...props} />;
}

export function CertIcon(props: IconProps) {
  return <Award {...props} />;
}

export function MailIcon(props: IconProps) {
  return <Mail {...props} />;
}

export function ClockIcon(props: IconProps) {
  return <Clock {...props} />;
}

export function ChatIcon(props: IconProps) {
  return <MessageSquare {...props} />;
}

export function MessagingIcon(props: IconProps) {
  return <MessageCircle {...props} />;
}

export function ClipboardIcon(props: IconProps) {
  return <ClipboardList {...props} />;
}

export function ShieldIcon(props: IconProps) {
  return <Shield {...props} />;
}

export function CalendarIcon(props: IconProps) {
  return <Calendar {...props} />;
}
