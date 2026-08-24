type LoaderSize = "sm" | "md" | "lg";
type LoaderTone = "brand" | "current";

const DIAMETER: Record<LoaderSize, number> = { sm: 18, md: 32, lg: 52 };
const STROKE: Record<LoaderSize, number> = { sm: 2, md: 3, lg: 4 };

type LoaderProps = {
  size?: LoaderSize;
  /** "brand" (gold arc) for page/section use; "current" inherits the button's
   * text color — needed inside a gold btn-primary where a gold ring would vanish. */
  tone?: LoaderTone;
  className?: string;
};

/** Purely visual, like <Skeleton /> — wrap with role="status"/aria-label at the call site. */
export function Loader({ size = "md", tone = "brand", className = "" }: LoaderProps) {
  return (
    <span
      aria-hidden="true"
      className={`loader-ring loader-ring--${tone} inline-block shrink-0 ${className}`}
      style={{
        width: DIAMETER[size],
        height: DIAMETER[size],
        ["--loader-stroke" as string]: `${STROKE[size]}px`,
      }}
    />
  );
}

type PageLoaderProps = {
  label?: string;
  className?: string;
};

/** Full-page variant for blocking waits: auth gates, route transitions. */
export function PageLoader({ label = "Chargement…", className = "" }: PageLoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`app-horizon flex min-h-screen flex-col items-center justify-center gap-4 ${className}`}
    >
      <Loader size="lg" />
      <p className="text-sm font-medium text-muted">{label}</p>
    </div>
  );
}
