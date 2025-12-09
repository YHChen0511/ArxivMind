import { Paper } from "../types";

const BASE_URL = "https://export.arxiv.org/api/query";

export const searchArxiv = async (query: string, maxResults: number = 10): Promise<Paper[]> => {
  // Arxiv API expects encoded URL parameters
  const params = new URLSearchParams({
    search_query: query,
    start: "0",
    max_results: maxResults.toString(),
    sortBy: "relevance",
    sortOrder: "descending",
  });

  const targetUrl = `${BASE_URL}?${params.toString()}`;
  
  // Arxiv API does not allow CORS requests from browsers.
  // We use a CORS proxy (corsproxy.io) to bypass this restriction.
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

  try {
    const response = await fetch(proxyUrl);
    if (!response.ok) {
      throw new Error(`Arxiv API error: ${response.statusText}`);
    }
    const xmlText = await response.text();
    return parseArxivXml(xmlText);
  } catch (error) {
    console.error("Error fetching from Arxiv:", error);
    throw error;
  }
};

const parseArxivXml = (xml: string): Paper[] => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xml, "text/xml");
  const entries = xmlDoc.getElementsByTagName("entry");
  const papers: Paper[] = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    
    // Helper to safely get text content
    const getText = (tag: string) => {
      const el = entry.getElementsByTagName(tag)[0];
      return el ? el.textContent?.trim() || "" : "";
    };

    // Authors handle differently as there are multiple
    const authorTags = entry.getElementsByTagName("author");
    const authors: string[] = [];
    for (let j = 0; j < authorTags.length; j++) {
      const name = authorTags[j].getElementsByTagName("name")[0];
      if (name && name.textContent) authors.push(name.textContent.trim());
    }

    // Categories
    const categoryTags = entry.getElementsByTagName("category");
    const categories: string[] = [];
    for(let k=0; k < categoryTags.length; k++) {
        const term = categoryTags[k].getAttribute("term");
        if(term) categories.push(term);
    }

    papers.push({
      id: getText("id"),
      title: getText("title").replace(/\n/g, " "), // Clean up newlines in titles
      summary: getText("summary").replace(/\n/g, " "),
      published: getText("published"),
      updated: getText("updated"),
      link: getText("id"), // Arxiv ID url is usually in the ID field
      authors: authors,
      categories: categories
    });
  }

  return papers;
};