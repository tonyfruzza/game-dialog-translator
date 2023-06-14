const fs = require("fs");

function writeHTMLFormattedDialogs(dialogs) {
  // Write at the header to auto refresh the page
  const htmlHeader = `<!DOCTYPE html>
  <html lang="en">

  <head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="1">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Yo-Kai Watch 4 Translation</title>
  </head>
  <script type="text/javascript">
    function autoRefreshPage() {
        window.location.reload();
    }
    setTimeout('autoRefreshPage()', 1000);
  </script>

  <body bgcolor=#00ff00 text=#FFFFFF><font size="+2"`;
  // fs.writeFileSync("dialogs.html", );
  const html = dialogs
    .map((dialog) => {
      const { role, content } = dialog;
      return `<p><!--<b>${role}:</b> -->${content}</p>`;
    })
    .join("\n");
  fs.writeFileSync("dialogs.html", htmlHeader + html);
}

module.exports = { writeHTMLFormattedDialogs };
