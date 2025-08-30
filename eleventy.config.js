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

    // other config
    eleventyConfig.addPassthroughCopy("assets");
    eleventyConfig.addPassthroughCopy("projects/**/images")
    eleventyConfig.addPassthroughCopy("CNAME");
    eleventyConfig.addPassthroughCopy("robots.txt");
    eleventyConfig.addPlugin(syntaxHighlight);

}