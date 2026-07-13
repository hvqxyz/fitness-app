const root = document.currentScript.src.replace(/common\/app-header\.js.*$/, '');

document.getElementById('app-header-slot').outerHTML = `
  <header class="app-header">
    <h1>Fitness Counter</h1>
    <a class="profile-avatar-link" href="${root}profile/index.html" aria-label="Profile">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="8" r="4"></circle>
        <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8"></path>
      </svg>
    </a>
  </header>
`;
