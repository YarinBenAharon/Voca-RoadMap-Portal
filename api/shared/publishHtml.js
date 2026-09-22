/* =========================================================================
   The standalone published file.

   This is buildPublishHTML() from the original editor, unchanged except that
   the stylesheet, the board runtime and the body markup now come from the
   three shared assets instead of from string constants. Those assets are
   copied into ./assets at build time by the deploy workflow (see
   tools/sync_api_assets.py), so the served page, the editor and this file
   are all generated from one copy of the design.
   ========================================================================= */

const fs   = require('fs');
const path = require('path');

const ASSETS   = path.join(__dirname, 'assets');
const render   = require('./assets/render.js');
const BASE_CSS = fs.readFileSync(path.join(ASSETS, 'base.css'), 'utf8');
const BOARD_JS = fs.readFileSync(path.join(ASSETS, 'board.js'), 'utf8');

const esc = render.esc;

function buildPublishHTML(data){
  const m = data.meta;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(m.product)} ${esc(m.title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600&family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>${BASE_CSS}</style>
</head>
<body>

${render.buildBodyHTML(data, { session: false })}

<script>
${BOARD_JS}
initBoard();
initDrawer({ showBr:false });
<\/script>

</body>
</html>`;
}

module.exports = { buildPublishHTML };
