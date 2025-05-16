import fs from 'node:fs';

let outputFile = 'window.GFX_FONTS = {};\n\n';
fs.readdirSync('fonts').forEach(file => {
    const font = fs.readFileSync('fonts/'+file).toString();
    const bitmaps = font.match(/uint8_t (.+)\[\].+{((?:.|\n)+?)};/m);
    const glyphs = font.match(/GFXglyph (.+)\[\].+{((?:.|\n)+?)};/m);
    const meta = font.match(/GFXfont (.+?) .+{((?:.|\n)+)}/m);
    const metaValues = meta[2].replace(/(\n|\s|\(.+?\))/g, '').split(',');
    
    outputFile += `// Font ${meta[1]}\n`;
    outputFile += `const ${bitmaps[1]} = [\n`;
    outputFile += `    ${bitmaps[2].trim()}\n`;
    outputFile += '];\n\n';

    outputFile += `const ${glyphs[1]} = [\n`;
    outputFile += `    ${glyphs[2].trim().replace(/{/g, '[').replace(/}/g, ']')}\n`;
    outputFile += '];\n\n';

    outputFile += `const ${meta[1]} = {\n    bitmap: ${metaValues[0]}, glyph: ${metaValues[1]},\n    first: ${metaValues[2]}, last: ${metaValues[3]}, yAdvance: ${metaValues[4]}\n};\n`;
    outputFile += `window.GFX_FONTS['${meta[1]}'] = ${meta[1]};\n\n\n`;
});
fs.writeFileSync('gfx-fonts.js', outputFile);