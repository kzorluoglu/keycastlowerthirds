const ensureProtocol = (value) => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

const ensureParam = (url, paramExpression) => {
  if (!paramExpression) return url;
  if (url.includes(paramExpression)) {
    return url;
  }
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${paramExpression}`;
};

export const normalizeRemoteUrl = (value) => ensureProtocol(value);

export const buildEmbedUrl = (value) => {
  let url = ensureProtocol(value);
  if (!url) return "";
  url = ensureParam(url, "autoplay=1");
  url = ensureParam(url, "controls=0");
  url = ensureParam(url, "transparent=1");
  url = ensureParam(url, "muted=0");
  return url;
};
