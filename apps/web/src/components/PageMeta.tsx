import { Helmet } from "react-helmet-async";

interface PageMetaProps {
  title: string;
  description?: string;
}

export function PageMeta({ title, description }: PageMetaProps) {
  const fullTitle = `${title} — GymOS`;
  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
    </Helmet>
  );
}
