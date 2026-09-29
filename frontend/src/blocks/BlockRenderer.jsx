// Renders a single content block on the public site. One case per block
// type in blockTypes.js — keep this list in sync when adding a new type.
function isVideoFile(url = "") {
  return /\.(mp4|webm|mov)(\?.*)?$/i.test(url);
}

function HeroBlock({ data }) {
  return (
    <section
      className="relative flex min-h-[60vh] items-center bg-navy-950 bg-cover bg-center text-white"
      style={data.imageUrl ? { backgroundImage: `url(${data.imageUrl})` } : undefined}
    >
      <div className="absolute inset-0 bg-navy-950/70" />
      <div className="wrap relative py-20">
        {data.eyebrow && <p className="eyebrow-light mb-3">{data.eyebrow}</p>}
        <h1 className="max-w-3xl font-syne text-4xl font-semibold md:text-5xl">{data.headline}</h1>
        {data.subheadline && <p className="mt-4 max-w-2xl text-white/80">{data.subheadline}</p>}
        {data.ctaLabel && data.ctaHref && (
          <a href={data.ctaHref} className="btn-primary mt-8">
            {data.ctaLabel}
          </a>
        )}
      </div>
    </section>
  );
}

function RichTextBlock({ data }) {
  return (
    <section className="wrap py-14">
      {data.heading && <h2 className="mb-4 font-syne text-2xl font-semibold text-ink">{data.heading}</h2>}
      <div className="max-w-3xl space-y-4 text-slatey">
        {(data.body || "").split("\n").filter(Boolean).map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>
    </section>
  );
}

function ImageBlock({ data }) {
  if (!data.url) return null;
  return (
    <figure className="wrap py-10">
      <img src={data.url} alt={data.alt || ""} className="w-full" />
      {data.caption && <figcaption className="mt-2 text-sm text-slatey">{data.caption}</figcaption>}
    </figure>
  );
}

function VideoBlock({ data }) {
  if (!data.url) return null;
  return (
    <figure className="wrap py-10">
      {isVideoFile(data.url) ? (
        <video src={data.url} controls className="w-full" />
      ) : (
        <iframe
          src={data.url}
          className="aspect-video w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      )}
      {data.caption && <figcaption className="mt-2 text-sm text-slatey">{data.caption}</figcaption>}
    </figure>
  );
}

function TestimonialBlock({ data }) {
  return (
    <section className="wrap py-14">
      <blockquote className="max-w-2xl border-l-4 border-teal-500 pl-6">
        <p className="text-lg text-ink">“{data.quote}”</p>
        <footer className="mt-3 text-sm text-slatey">
          {data.author}
          {data.role ? `, ${data.role}` : ""}
        </footer>
      </blockquote>
    </section>
  );
}

function CtaBlock({ data }) {
  return (
    <section className="bg-navy-950 py-16 text-white">
      <div className="wrap text-center">
        {data.heading && <h2 className="font-syne text-3xl font-semibold">{data.heading}</h2>}
        {data.body && <p className="mx-auto mt-3 max-w-xl text-white/80">{data.body}</p>}
        {data.buttonLabel && data.buttonHref && (
          <a href={data.buttonHref} className="btn-primary mt-6 inline-flex">
            {data.buttonLabel}
          </a>
        )}
      </div>
    </section>
  );
}

function GalleryBlock({ data }) {
  const images = data.images || [];
  if (images.length === 0) return null;
  return (
    <section className="wrap py-14">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {images.map((img, i) => (
          <img key={i} src={img.url} alt={img.alt || ""} className="aspect-square w-full object-cover" />
        ))}
      </div>
    </section>
  );
}

function MetricsBlock({ data }) {
  const items = data.items || [];
  if (items.length === 0) return null;
  return (
    <section className="bg-mist py-14">
      <div className="wrap grid grid-cols-2 gap-8 text-center md:grid-cols-4">
        {items.map((item, i) => (
          <div key={i}>
            <p className="font-syne text-3xl font-semibold text-teal-600">{item.value}</p>
            <p className="mt-1 text-sm text-slatey">{item.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function QuickLinksBlock({ data }) {
  const items = data.items || [];
  if (items.length === 0) return null;
  return (
    <nav className="border-y border-black/5 bg-mist">
      <div className="wrap flex flex-wrap justify-center gap-x-10 gap-y-3 py-5 text-sm">
        {items.map((item, i) => (
          <a key={i} href={item.href} className="font-medium text-ink hover:text-teal-600">
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

function BadgesBlock({ data }) {
  const items = data.items || [];
  if (items.length === 0) return null;
  return (
    <section className="wrap py-14">
      {data.heading && <h2 className="mb-8 font-syne text-2xl font-semibold text-ink">{data.heading}</h2>}
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => (
          <div key={i} className="flex gap-3">
            <span className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-teal-500 text-navy-950">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
            <div>
              <p className="font-semibold text-ink">{item.title}</p>
              {item.description && <p className="mt-1 text-sm text-slatey">{item.description}</p>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FeatureCardsBlock({ data }) {
  const items = data.items || [];
  if (items.length === 0) return null;
  return (
    <section className="wrap py-14">
      {data.heading && <h2 className="mb-3 font-syne text-2xl font-semibold text-ink">{data.heading}</h2>}
      {data.intro && <p className="mb-10 max-w-2xl text-slatey">{data.intro}</p>}
      <div className="space-y-14">
        {items.map((item, i) => {
          const imageOnRight = i % 2 === 0;
          return (
            <div key={i} className="grid items-center gap-8 md:grid-cols-2">
              {item.imageUrl && (
                <div className={imageOnRight ? "md:order-2" : ""}>
                  <img src={item.imageUrl} alt={item.title || ""} className="aspect-video w-full object-cover" />
                </div>
              )}
              <div className={item.imageUrl && imageOnRight ? "md:order-1" : ""}>
                <h3 className="font-syne text-xl font-semibold text-ink">{item.title}</h3>
                {item.description && <p className="mt-3 text-slatey">{item.description}</p>}
                {item.linkLabel && item.linkHref && (
                  <a href={item.linkHref} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-teal-600 hover:text-teal-700">
                    {item.linkLabel}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

const RENDERERS = {
  hero: HeroBlock,
  richtext: RichTextBlock,
  image: ImageBlock,
  video: VideoBlock,
  testimonial: TestimonialBlock,
  cta: CtaBlock,
  gallery: GalleryBlock,
  metrics: MetricsBlock,
  quickLinks: QuickLinksBlock,
  badges: BadgesBlock,
  featureCards: FeatureCardsBlock,
};

export default function BlockRenderer({ block }) {
  const Component = RENDERERS[block.type];
  if (!Component) return null;
  return <Component data={block.data} />;
}
