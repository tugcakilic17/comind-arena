// Deduplicate image preparation, including CSS backgrounds, across screens.
// Failed requests are removed so a retry can actually fetch again.
// Resolve to void: let the browser manage bitmap memory rather than retaining
// every large Image object for the entire session.
export const baseUrl = import.meta.env?.BASE_URL ?? '/';
const decoded = new Map();

export function prepareImages(urls) {
  return Promise.all([...new Set(urls)].map(url => {
    if (decoded.has(url)) return decoded.get(url);
    const image = new Image();
    image.src = url;
    let timeout;
    const task = Promise.race([
      image.decode(),
      new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error(`Image timed out: ${url}`)), 15000); }),
    ]).catch(error => { decoded.delete(url); throw error; }).finally(() => clearTimeout(timeout));
    decoded.set(url, task);
    return task;
  }));
}

export function markupImages(markup) {
  const template = document.createElement('template');
  template.innerHTML = markup;
  return [...template.content.querySelectorAll('img[src], image[href]')].map(image => image.getAttribute('src') || image.getAttribute('href'));
}
