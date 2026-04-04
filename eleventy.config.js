import markdownIt from "markdown-it";
import markdownItAttrs from "markdown-it-attrs";
import markdownItAnchor from "markdown-it-anchor";
import syntaxHighlight from "@11ty/eleventy-plugin-syntaxhighlight";
import sitemap from "@quasibit/eleventy-plugin-sitemap";
import markdownItKatex from "@iktakahiro/markdown-it-katex";



export default function (eleventyConfig) {
    // Configure markdown-it library with attrs
    let options = {
        html: true,
        breaks: true,
        linkify: true
    };

    const mdLib = markdownIt(options)
        .use(markdownItAttrs)
        .use(markdownItAnchor, {
            permalink: markdownItAnchor.permalink.ariaHidden({
                placement: "after",
                symbol: "§",
                class: "heading-anchor",
            }),
        })
        .use(markdownItKatex);

    eleventyConfig.setLibrary("md", mdLib);

    eleventyConfig.addPlugin(sitemap, {
        sitemap: {
            hostname: "https://mcloughlan.com",
        },
    });

    // Set current year
    eleventyConfig.addFilter("year", () => new Date().getFullYear());

    // First item per distinct value of `attr` (e.g. logo filename). Preserves order. */
    eleventyConfig.addFilter("uniqueBy", (arr, attr) => {
        if (!Array.isArray(arr)) return [];
        const seen = new Set();
        return arr.filter((item) => {
            const key = item?.[attr];
            if (key == null || seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    });

    // other config
    eleventyConfig.addPassthroughCopy("assets");
    eleventyConfig.addPassthroughCopy("projects/**/images")
    eleventyConfig.addPassthroughCopy("CNAME");
    eleventyConfig.addPassthroughCopy("r.html");
    eleventyConfig.addPassthroughCopy("robots.txt");
    eleventyConfig.addPlugin(syntaxHighlight);

}