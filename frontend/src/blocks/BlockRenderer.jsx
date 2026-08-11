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

const RENDERERS = {
  hero: HeroBlock,
  richtext: RichTextBlock,
  image: ImageBlock,
  video: VideoBlock,
  testimonial: TestimonialBlock,
  cta: CtaBlock,
  gallery: GalleryBlock,
  metrics: MetricsBlock,
};

export default function BlockRenderer({ block }) {
  const Component = RENDERERS[block.type];
  if (!Component) return null;
  return <Component data={block.data} />;
}
