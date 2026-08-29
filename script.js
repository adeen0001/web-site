// ======================================================
// THE PERFECT DAY - script.js
// nothing too crazy here, just a few small interactions
// ======================================================

document.addEventListener('DOMContentLoaded', function () {

  // --------------------------------------------------
  // smooth scroll for nav links
  // (html already has scroll-behavior: smooth in the css,
  // but keeping this too in case someone strips the css out)
  // --------------------------------------------------
  var navLinks = document.querySelectorAll('.nav-links a');
  navLinks.forEach(function (link) {
    link.addEventListener('click', function (e) {
      var targetId = this.getAttribute('href');
      var target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });


  // --------------------------------------------------
  // STICKY NOTES / CORKBOARD
  // probably the most fiddly part of this whole page, drag
  // logic always ends up messier than you think it'll be
  // --------------------------------------------------
  var NOTES_KEY = 'perfectDayNotes'
  var corkboard = document.getElementById('corkboard')
  var addNoteBtn = document.getElementById('addNoteBtn')

  var noteColors = ['note-peach', 'note-lavender', 'note-blue', 'note-mint']

  // var noteCount = 0 // unused for now, thought I'd need it for a counter badge but didn't

  function getNotes() {
    var raw = localStorage.getItem(NOTES_KEY)
    if (!raw) return []
    try {
      return JSON.parse(raw)
    } catch (err) {
      console.warn('notes data was corrupted, starting fresh', err)
      return []
    }
  }

  function persistNotes(notes) {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes))
  }

  function updateNote(id, changes) {
    var notes = getNotes()
    var idx = notes.findIndex(function (n) { return n.id === id })
    if (idx === -1) return
    notes[idx] = Object.assign({}, notes[idx], changes)
    persistNotes(notes)
  }

  function deleteNote(id) {
    var notes = getNotes().filter(function (n) { return n.id !== id })
    persistNotes(notes)
  }

  function formatTimestamp(date) {
    // e.g. "Aug 29, 2026" - toLocaleDateString does most of the work for us
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  function randomBetween(min, max) {
    return Math.random() * (max - min) + min
  }

  // builds the actual DOM for one note, given its data object
  function buildNoteEl(note) {
    var el = document.createElement('div')
    el.className = 'sticky-note ' + note.color
    el.dataset.id = note.id
    el.style.left = note.x + 'px'
    el.style.top = note.y + 'px'
    el.style.transform = 'rotate(' + note.rotation + 'deg)'

    var delBtn = document.createElement('button')
    delBtn.className = 'note-delete'
    delBtn.innerHTML = '&times;' // x symbol, easier than typing an actual x and worrying about encoding
    delBtn.title = 'delete this note'
    delBtn.addEventListener('click', function (e) {
      e.stopPropagation() // don't want this bubbling into the drag handler
      el.remove()
      deleteNote(note.id)
    })

    var textarea = document.createElement('textarea')
    textarea.className = 'note-textarea'
    textarea.placeholder = "what does your perfect day look like..."
    textarea.value = note.text || ''

    // autosave - just fires on every keystroke, not the most efficient
    // but honestly for a textarea this small it doesn't matter
    textarea.addEventListener('input', function () {
      updateNote(note.id, { text: textarea.value })
    })

    // stop the drag handler from kicking in when you're just trying to type
    textarea.addEventListener('mousedown', function (e) { e.stopPropagation() })

    var stamp = document.createElement('div')
    stamp.className = 'note-timestamp'
    stamp.textContent = note.timestamp

    el.appendChild(delBtn)
    el.appendChild(textarea)
    el.appendChild(stamp)

    makeDraggable(el, note.id)

    return el
  }

  function renderNotes() {
    var notes = getNotes()
    corkboard.innerHTML = '' // hacky but works, just wipe and rebuild every time

    if (notes.length === 0) {
      var empty = document.createElement('p')
      empty.className = 'notes-empty'
      empty.textContent = 'no notes yet, click "add new note" to start pinning your thoughts up here'
      corkboard.appendChild(empty)
      return
    }

    notes.forEach(function (note) {
      corkboard.appendChild(buildNoteEl(note))
    })
  }

  function addNote() {
    var boardRect = corkboard.getBoundingClientRect()

    // keep new notes roughly inside the visible board, with a little randomness
    // so they don't all stack in exactly the same spot
    var maxX = Math.max(boardRect.width - 230, 40)
    var maxY = Math.max(boardRect.height - 220, 40)

    var note = {
      id: 'note-' + Date.now(), // good enough for uniqueness here
      text: '',
      color: noteColors[Math.floor(Math.random() * noteColors.length)],
      rotation: Math.round(randomBetween(-6, 6)),
      x: Math.round(randomBetween(20, maxX)),
      y: Math.round(randomBetween(20, maxY)),
      timestamp: formatTimestamp(new Date())
    }

    var notes = getNotes()
    notes.push(note)
    persistNotes(notes)

    // if the board was showing the empty state, clear that out first
    var emptyMsg = corkboard.querySelector('.notes-empty')
    if (emptyMsg) emptyMsg.remove()

    var noteEl = buildNoteEl(note)
    corkboard.appendChild(noteEl)

    // focus the textarea right away so they can start typing immediately
    var ta = noteEl.querySelector('.note-textarea')
    if (ta) ta.focus()
  }

  // --- drag logic, plain mouse events, no library ---
  function makeDraggable(el, id) {
    var offsetX = 0
    var offsetY = 0
    var isDown = false

    el.addEventListener('mousedown', function (e) {
      isDown = true
      el.classList.add('dragging')

      var rect = el.getBoundingClientRect()
      offsetX = e.clientX - rect.left
      offsetY = e.clientY - rect.top

      // bring the note being dragged above the others
      el.style.zIndex = 999
    })

    document.addEventListener('mousemove', function (e) {
      if (!isDown) return

      var boardRect = corkboard.getBoundingClientRect()
      var newX = e.clientX - boardRect.left - offsetX
      var newY = e.clientY - boardRect.top - offsetY

      // clamp so people can't drag notes completely off the board
      newX = Math.max(0, Math.min(newX, boardRect.width - el.offsetWidth))
      newY = Math.max(0, Math.min(newY, boardRect.height - el.offsetHeight))

      el.style.left = newX + 'px'
      el.style.top = newY + 'px'
    })

    document.addEventListener('mouseup', function () {
      if (!isDown) return
      isDown = false
      el.classList.remove('dragging')
      el.style.zIndex = ''

      // save the new position so it sticks around after a refresh
      updateNote(id, {
        x: parseInt(el.style.left, 10),
        y: parseInt(el.style.top, 10)
      })
    })

    // basic touch support so this isn't totally broken on mobile/tablet
    el.addEventListener('touchstart', function (e) {
      isDown = true
      el.classList.add('dragging')
      var touch = e.touches[0]
      var rect = el.getBoundingClientRect()
      offsetX = touch.clientX - rect.left
      offsetY = touch.clientY - rect.top
    }, { passive: true })

    document.addEventListener('touchmove', function (e) {
      if (!isDown) return
      var touch = e.touches[0]
      var boardRect = corkboard.getBoundingClientRect()
      var newX = touch.clientX - boardRect.left - offsetX
      var newY = touch.clientY - boardRect.top - offsetY
      newX = Math.max(0, Math.min(newX, boardRect.width - el.offsetWidth))
      newY = Math.max(0, Math.min(newY, boardRect.height - el.offsetHeight))
      el.style.left = newX + 'px'
      el.style.top = newY + 'px'
    }, { passive: true })

    document.addEventListener('touchend', function () {
      if (!isDown) return
      isDown = false
      el.classList.remove('dragging')
      updateNote(id, {
        x: parseInt(el.style.left, 10),
        y: parseInt(el.style.top, 10)
      })
    })
  }

  if (addNoteBtn) {
    addNoteBtn.addEventListener('click', addNote)
  }

  // kick things off - render whatever was saved from last time
  if (corkboard) renderNotes()


  // --------------------------------------------------
  // MOOD TRACKER
  // click an emoji -> style it as picked, save to localStorage, show toast
  // --------------------------------------------------
  var moodButtons = document.querySelectorAll('.mood-btn');
  var moodStatus = document.getElementById('moodStatus');
  var toastEl = document.getElementById('toast');
  var STORAGE_KEY = 'perfectDayMood'; // keeping it simple, just one key

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');

    // hide it again after a couple seconds
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () {
      toastEl.classList.remove('show');
    }, 2200);
  }

  function saveMood(mood) {
    var today = new Date().toDateString();
    var payload = { mood: mood, date: today };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  function renderMoodStatus(mood) {
    moodStatus.textContent = "you're feeling " + mood + " today, noted 💛";
  }

  moodButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      // clear the picked class off every button first
      moodButtons.forEach(function (b) { b.classList.remove('picked'); });
      btn.classList.add('picked');

      var mood = btn.getAttribute('data-mood');
      saveMood(mood);
      renderMoodStatus(mood);
      showToast('Mood saved for today!');
    });
  });

  // check localStorage on load, restore whatever the user picked earlier today
  (function restoreMood() {
    var saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

    try {
      var parsed = JSON.parse(saved);
      var today = new Date().toDateString();
      if (parsed.date === today) {
        renderMoodStatus(parsed.mood);
        var matchingBtn = document.querySelector('.mood-btn[data-mood="' + parsed.mood + '"]');
        if (matchingBtn) matchingBtn.classList.add('picked');
      }
    } catch (err) {
      // if for some reason the saved data is broken, just ignore it
      console.warn('could not parse saved mood', err);
    }
  })();


  // --------------------------------------------------
  // DAILY QUOTE
  // TODO: add more quotes later, this list is pretty short
  // --------------------------------------------------
  var quotes = [
    { text: "The perfect day isn't perfect, it's just yours.", by: "Unknown" },
    { text: "Small steps every day still get you somewhere beautiful.", by: "Unknown" },
    { text: "Today is a good day to have a good day.", by: "Unknown" },
    { text: "Slow mornings are still productive mornings.", by: "Unknown" },
    { text: "You don't need a reason to rest.", by: "Unknown" },
    { text: "Be soft with yourself, you're doing your best.", by: "Unknown" }
  ];

  var quoteTextEl = document.getElementById('quoteText');
  var quoteByEl = document.getElementById('quoteBy');
  var newQuoteBtn = document.getElementById('newQuoteBtn');
  var lastIndex = -1; // so we don't repeat the same quote twice in a row

  function pickRandomQuote() {
    var i;
    do {
      i = Math.floor(Math.random() * quotes.length);
    } while (i === lastIndex && quotes.length > 1);
    lastIndex = i;
    return quotes[i];
  }

  function renderQuote(q) {
    quoteTextEl.style.opacity = 0;

    setTimeout(function () {
      quoteTextEl.textContent = q.text;
      quoteByEl.textContent = '— ' + q.by;
      quoteTextEl.style.opacity = 1;
    }, 200);
  }

  // show one right away on page load
  renderQuote(pickRandomQuote());

  newQuoteBtn.addEventListener('click', function () {
    renderQuote(pickRandomQuote());
  });


  // --------------------------------------------------
  // FADE-IN ON SCROLL
  // pretty basic intersection observer, nothing fancy
  // --------------------------------------------------
  var fadeEls = document.querySelectorAll('.fade-in');

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target); // only need to run once per element
        }
      });
    }, { threshold: 0.15 });

    fadeEls.forEach(function (el) { observer.observe(el); });
  } else {
    // old browser fallback, just show everything
    fadeEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

});
