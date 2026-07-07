import { defineConfig } from "vite";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { readdir } from "fs/promises";
import { resolve, dirname, basename } from "path";
import { marked } from "marked";

marked.use({
  renderer: {
    code({ text, lang }) {
      if (lang === "mermaid") {
        return `<pre class="mermaid">${text}</pre>\n`;
      }
      return false;
    },
  },
});

const docsDir = resolve("../docs");
const outputFile = resolve("components/app-docs/data.js");

function decodeEntities(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function transformBashBlocks(html) {
  return html.replace(
    /<pre><code class="language-bash">([\s\S]*?)<\/code><\/pre>/g,
    (_, content) => {
      const clean = decodeEntities(content).trim();
      return `<copy-console content="${clean.replace(/"/g, "&quot;")}"></copy-console>`;
    }
  );
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { attributes: {}, body: raw };
  const attrs = {};
  match[1].split("\n").forEach((line) => {
    const [key, ...rest] = line.split(":");
    if (key && rest.length) attrs[key.trim()] = rest.join(":").trim();
  });
  return { attributes: attrs, body: match[2] };
}

async function generateDataFile() {
  const files = (await readdir(docsDir, { recursive: true })).filter((f) => f.endsWith(".md"));
  const documents = {}

  for (const file of files) {
    const raw = readFileSync(resolve(docsDir, file), "utf-8");
    const { attributes, body } = parseFrontmatter(raw);

    const category = basename(dirname(resolve(docsDir, file)));
    if (documents[category] === undefined) {
      documents[category] = {
        sections: []
      }
    }

    if (file.endsWith("/index.md")) {
      documents[category] = {
        order: parseInt(attributes.order || "99", 10),
        ...attributes,
        ...documents[category],
      }
      continue;
    }

    const html = transformBashBlocks(marked.parse(body));
    documents[category].sections.push({
      id: attributes.id || "",
      title: attributes.name || "",
      order: parseInt(attributes.order || "99", 10),
      category,
      html,
    });
  }

  for (let category in documents) {
    documents[category].sections.sort((a, b) => a.order - b.order);
  }

  const outDir = dirname(outputFile);
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  writeFileSync(
    outputFile,
    `export const ducuments = ${JSON.stringify(documents, null, 2)};\n`
  );
}

function docsPlugin() {
  return {
    name: "vite-plugin-docs-to-data",
    async buildStart() {
      await generateDataFile();
    },
    configureServer(server) {
      server.watcher.add(docsDir);
      server.watcher.on("change", async (path) => {
        if (path.startsWith(docsDir) && path.endsWith(".md")) {
          await generateDataFile();
          server.ws.send({ type: "full-reload" });
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [docsPlugin()],
  base: process.env.BASE_URL || "/",
  build: {
    outDir: "dist",
  },
});
