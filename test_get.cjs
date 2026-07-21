fetch('https://vorlesungsverzeichnis.unibas.ch/de/vorlesungsverzeichnis?title=Analysis+I&search=1')
  .then(r => r.text())
  .then(t => {
    const matches = t.match(/<a[^>]*href="\/de\/details\?id=[0-9]+"[^>]*>/g);
    console.log(matches);
  });
